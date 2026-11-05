#!/usr/bin/env node
/** Verificador local offline para JSON de recepción LAB, NO certifica autenticidad. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {verificarExpedienteRecepcionLab} from '../src/cierre-recepcion-expediente-lab.mjs';
const path=process.argv[2];
if(!path){console.error('Uso: node lab/verificar-expediente-lab.mjs expediente.json');process.exitCode=2;}
else try{
  const size=readFileSync(resolve(path));
  if(size.length>2_000_000)throw Error('Tamaño de expediente LAB excesivo');
  const r=await verificarExpedienteRecepcionLab(JSON.parse(size.toString('utf8')));
  console.log(JSON.stringify(r,null,2));
}catch(e){console.error('NO VERIFICADO: '+e.message);process.exitCode=1;}
