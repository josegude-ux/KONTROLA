"""Full checked-out HTML end-to-end checks for VISURA; synthetic data only."""
import contextlib
import http.server
import json
import socketserver
import threading
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
assert (DOCS / "index.html").exists(), "Execute in checked-out repo"
assert (DOCS / "VISURA_ORDENES.html").read_bytes() == (DOCS / "index.html").read_bytes()

class QuietServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, fmt, *args):
        pass

class ReusableServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

with ReusableServer(("127.0.0.1", 0), QuietServer) as httpd:
    port = httpd.server_address[1]
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    base = f"http://127.0.0.1:{port}/docs/"
    for path in ("index.html", "VISURA_ORDENES.html", "chatgpt-import.js",
                 "visura-recovery.js", "visura-recovery.css",
                 "assets/icons/apple-touch-icon.png", "manifest.webmanifest"):
        with urllib.request.urlopen(base + path) as response:
            assert response.status == 200, (path, response.status)
            data = response.read()
            assert data, path
            if path.endswith(".png"):
                assert response.headers.get_content_type() == "image/png"
                assert data[:8] == b"\x89PNG\r\n\x1a\n"
            if path == "manifest.webmanifest":
                manifest = json.loads(data)
                assert manifest["short_name"] == "VISURA MANDO"
    print("HTTP local 200: two HTML, scripts, styles, icon PNG and manifest")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height, label in [
            (390, 844, "mobile"), (768, 1024, "tablet"), (1440, 900, "desktop")
        ]:
            page = browser.new_page(viewport={"width": width, "height": height})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.add_init_script("""
                window.__copied = [];
                window.confirm = () => true;
                Object.defineProperty(navigator, 'clipboard', {
                    configurable: true,
                    value: {writeText: async (value) => {window.__copied.push(value);}}
                });
                document.execCommand = (op) => {
                    if (op === 'copy') {
                      window.__copied.push(document.activeElement.value);
                      return true;
                    }
                    return false;
                };
            """)
            response = page.goto(base + "index.html", wait_until="load")
            assert response.status == 200
            expect(page.locator("#command-menu")).to_be_visible()
            assert page.locator('[data-open-order="funcion-11"]').count() == 1
            assert page.locator('[data-open-order="funcion-1"]').count() == 1
            assert page.locator("#funcion-11").is_hidden()
            for n in range(1, 12):
                assert page.locator(f"#funcion-{n}").count() == 1

            # Import official-format metadata without ever persisting messages.
            page.locator("#open-chat-manager").click()
            expect(page.locator("#chatgpt-import-section")).to_be_visible()
            assert page.locator("#chatgpt-import-files").is_enabled()
            chat_id = "a" * 32
            synthetic = [{
                "id": chat_id, "title": "07 - VISURA INVENTA - Desarrollo de Inventario Físico",
                "update_time": 42, "mapping": {"private": {"message": "SENSITIVE_SENTINEL_DO_NOT_STORE"}}
            }, {
                "id": "b" * 32, "title": "Tema sin relación", "update_time": 40
            }]
            page.locator("#chatgpt-import-files").set_input_files({
                "name": "conversations.json", "mimeType": "application/json",
                "buffer": json.dumps(synthetic).encode()
            })
            expect(page.locator("#chatgpt-import-review")).to_be_visible()
            assert "2 chats" in page.locator("#chatgpt-import-status").inner_text()
            page.locator("#chatgpt-import-apply").click()
            expect(page.locator("#chatgpt-import-status")).to_contain_text("Guardados:")
            saved = json.loads(page.evaluate(
                "localStorage.getItem('visura-centro-chats-v1')"
            ))
            records = saved["chats"]
            assert sum(x.get("conversationId") == chat_id for x in records) == 1
            assert all("mapping" not in x and "messages" not in x for x in records)
            assert "SENSITIVE_SENTINEL_DO_NOT_STORE" not in json.dumps(saved)
            assert not any(x.get("conversationId") == "b" * 32 for x in records)

            # Same stable ID with a new title must update, not duplicate.
            updated_title = "07 - VISURA INVENTA - Inventario Físico RENOMBRADO"
            page.locator("#chatgpt-import-files").set_input_files({
                "name": "conversations.json", "mimeType": "application/json",
                "buffer": json.dumps([{
                    "id": chat_id, "title": updated_title, "update_time": 44
                }]).encode()
            })
            expect(page.locator("#chatgpt-import-review")).to_be_visible()
            page.locator("#chatgpt-import-apply").click()
            saved2 = json.loads(page.evaluate(
                "localStorage.getItem('visura-centro-chats-v1')"
            ))
            renamed = [x for x in saved2["chats"] if x.get("conversationId") == chat_id]
            assert len(renamed) == 1 and renamed[0]["name"] == updated_title, renamed

            # Real navigation of complete HTML, not mock DOM.
            page.locator('[data-open-order="funcion-11"]').click()
            expect(page.locator("#funcion-11")).to_be_visible()
            assert page.locator("#funcion-1").is_hidden()
            page.locator("#recovery-project").fill("VISURA INVENTA")
            page.locator("#recovery-owner").fill("07 - VISURA INVENTA")
            page.locator("#recovery-copy-diagnostic").click()
            page.wait_for_function("window.__copied.length > 0")
            copied = page.evaluate("window.__copied.at(-1)")
            full_diag = page.locator("#recovery-diagnostic").inner_text()
            assert copied == full_diag and len(copied) > 400

            answer = ("PROYECTO: VISURA INVENTA\nCHAT RESPONSABLE: 07\n"
                      "CAUSA: error de streaming\n"
                      "EVIDENCIAS: aviso de interrupción de streaming\n"
                      "TRABAJO PENDIENTE: ejecutar las pruebas\n"
                      "ÚLTIMA TAREA COMPLETADA: commit 1234abcd\n"
                      "SIGUIENTE ACCIÓN SEGURA: verificar HEAD")
            page.locator("#recovery-answer").fill(answer)
            page.locator("#recovery-analyze").click()
            expect(page.locator("#recovery-analysis")).to_contain_text("Tipo B")
            page.locator("#recovery-copy-prompt").click()
            page.wait_for_function("window.__copied.length > 1")
            full_prompt = page.locator("#recovery-prompt").inner_text()
            assert page.evaluate("window.__copied.at(-1)") == full_prompt
            assert len(full_prompt) > 600 and "TIPO B" in full_prompt

            page.locator("#recovery-result").fill(
                "El bloqueo continúa. Sigue bloqueado; no se pudo reanudar."
            )
            page.locator("#recovery-verify").click()
            expect(page.locator("#recovery-verification")).to_contain_text(
                "bloqueo continúa"
            )
            page.locator("#recovery-answer").fill(
                "PROYECTO: VISURA\nCAUSA: desconocida\nNo hay error de streaming.\n"
                "TRABAJO PENDIENTE: revisar contexto"
            )
            page.locator("#recovery-analyze").click()
            assert "Tipo B" not in page.locator("#recovery-analysis").inner_text()

            # Existing function continues to navigate and produce a prompt.
            page.locator("#back-to-dashboard").click()
            expect(page.locator("#command-menu")).to_be_visible()
            page.locator('[data-open-order="funcion-1"]').click()
            expect(page.locator("#funcion-1")).to_be_visible()
            assert page.locator("#funcion-11").is_hidden()
            assert page.locator("[data-copy='0']").count() == 1
            page.locator("[data-copy='0']").click()
            page.wait_for_function("window.__copied.length > 2")
            assert len(page.evaluate("window.__copied.at(-1)")) > 150

            assert page.evaluate(
                "document.documentElement.scrollWidth <= window.innerWidth + 2"
            ), f"Horizontal overflow at {width}px"
            assert not errors, (label, errors)
            print(f"E2E PASS {label} {width}x{height}: full HTML, import/rename, "
                  f"diagnosis, copy, verify, old navigation, no JS errors/overflow")
            page.close()
        browser.close()
    httpd.shutdown()
print("PASS Full VISURA combined application E2E")