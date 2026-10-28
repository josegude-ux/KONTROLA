"""E2E externo de staging VISURA (solo datos ficticios, sin importaciones)."""
import os
from playwright.sync_api import sync_playwright, expect

URL = os.environ["STAGING_URL"].rstrip("/")
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width, height, label in (
        (390, 844, "iPhone emulado"),
        (768, 1024, "tableta"),
        (1440, 900, "escritorio"),
    ):
        page = browser.new_page(viewport={"width": width, "height": height}, ignore_https_errors=False)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.add_init_script("""() => {
          window.__copied=[];
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: async txt => { window.__copied.push(txt); } }
          });
        }""")
        response = page.goto(URL + "/index.html", wait_until="load", timeout=30000)
        if response is None or response.status != 200:
            print("HTTP_BROWSER_STATUS", response.status if response else None, "URL", page.url)
            print("PAGINA_TITULO", page.title())
            print("PAGINA_FRAGMENTO", page.locator("body").inner_text(timeout=5000)[:450])
            raise AssertionError("El alojamiento no responde con HTML 200 a Chromium")
        expect(page.locator("#command-menu")).to_be_visible()
        assert page.locator('link[rel="apple-touch-icon"]').count() == 1
        assert page.locator('link[rel="manifest"]').count() == 1

        # Todas las opciones navegan sin modificar scripts ni estado de produccion.
        for n in range(1, 12):
            button = page.locator(f'[data-open-order="funcion-{n}"]')
            assert button.count() == 1, f"Menu {n} no existe"
            button.click()
            expect(page.locator(f"#funcion-{n}")).to_be_visible()
            page.locator("#back-to-dashboard").click()
            expect(page.locator("#command-menu")).to_be_visible()

        page.locator("#open-chat-manager").click()
        expect(page.locator("#chatgpt-import-section")).to_be_visible()
        assert page.locator("#chatgpt-import-files").is_disabled(), "IMPORTADOR NO BLOQUEADO"
        expect(page.locator("#chatgpt-import-status")).to_contain_text("Importación privada desactivada")
        assert page.locator("#manager-export").count() == 1
        # No se introduce ni importa archivo; estos tests nunca tocan conversaciones reales.

        page.locator('[data-open-order="funcion-11"]').click()
        expect(page.locator("#funcion-11")).to_be_visible()
        page.locator("#recovery-project").fill("VISURA — EJEMPLO FICTICIO")
        page.locator("#recovery-owner").fill("03.1 — TEST")
        page.locator("#recovery-copy-diagnostic").click()
        page.wait_for_function("window.__copied.length >= 1", timeout=8000)
        assert page.evaluate("window.__copied.at(-1)") == page.locator("#recovery-diagnostic").inner_text()
        assert len(page.locator("#recovery-diagnostic").inner_text()) > 300

        page.locator("#recovery-answer").fill(
            "PROYECTO: VISURA TEST\n"
            "CHAT RESPONSABLE: 03.1 TEST\n"
            "CAUSA: error de streaming\n"
            "EVIDENCIAS: mensaje de interrupción, solo ejemplo inventado\n"
            "ÚLTIMA TAREA COMPLETADA: commit sintético abcd1234\n"
            "TRABAJO PENDIENTE: revisar pruebas locales\n"
            "SIGUIENTE ACCIÓN SEGURA: verificar HEAD ficticio"
        )
        page.locator("#recovery-analyze").click()
        expect(page.locator("#recovery-analysis")).to_contain_text("Tipo B")
        page.locator("#recovery-copy-prompt").click()
        page.wait_for_function("window.__copied.length >= 2", timeout=8000)
        full_prompt = page.locator("#recovery-prompt").inner_text()
        assert page.evaluate("window.__copied.at(-1)") == full_prompt
        assert len(full_prompt) > 500

        page.locator("#recovery-result").fill("Continúa el bloqueo ficticio; no hay nueva evidencia de avance")
        page.locator("#recovery-verify").click()
        expect(page.locator("#recovery-verification")).to_contain_text("bloqueo")

        # Texto no confiable debe mostrarse como texto, no crear elementos HTML ejecutables.
        page.locator("#recovery-answer").fill(
            "CAUSA: desconocida\nTRABAJO PENDIENTE: auditar\n"
            "<img src=x onerror=alert(1)> NO EJECUTAR\nNo hay error de streaming"
        )
        page.locator("#recovery-analyze").click()
        assert page.locator("#recovery-analysis img").count() == 0
        assert "Tipo B" not in page.locator("#recovery-analysis").inner_text()

        # Regresion de la funcion 01, que no debe sustituirse.
        page.locator("#back-to-dashboard").click()
        page.locator('[data-open-order="funcion-1"]').click()
        expect(page.locator("#funcion-1")).to_be_visible()
        page.locator('[data-copy="0"]').click()
        page.wait_for_function("window.__copied.length >= 3", timeout=8000)
        assert len(page.evaluate("window.__copied.at(-1)")) > 150

        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 2"), f"Desbordamiento horizontal {label}"
        assert not errors, (label, errors)
        print(f"STAGING E2E PASS: {label} {width}x{height} | 11 funciones | 2 copias completas | seguridad | no overflow")
        page.close()
    browser.close()
print("STAGING PR82: validacion externa real con datos ficticios terminada")
