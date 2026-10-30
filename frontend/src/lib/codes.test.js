import test from 'node:test'
import assert from 'node:assert/strict'
import { readCylinderCode,parseBatch } from './codes.js'
test('el QR y el código escrito identifican el mismo balón',()=>{
 assert.equal(readCylinderCode(' SYS-2026-LPG-001 '),'SYS-2026-LPG-001')
 assert.equal(readCylinderCode('https://sysgas.vercel.app/balon/SYS-2026-LPG-001'),'SYS-2026-LPG-001')
})
test('no sigue enlaces ajenos a la ruta de pasaporte ni acepta código malformado',()=>{
 assert.throws(()=>readCylinderCode('https://example.com/login'),/no contiene/)
 assert.throws(()=>readCylinderCode('<script>'),/código/)
})
test('el lote acepta separadores comunes y rechaza duplicados antes de enviar',()=>{
 assert.deepEqual(parseBatch('SYS-001\nSYS-002;SYS-003,SYS-004'),['SYS-001','SYS-002','SYS-003','SYS-004'])
 assert.throws(()=>parseBatch('SYS-001\nSYS-001'),/repetidos/)
 assert.throws(()=>parseBatch(''),/1 y 500/)
 assert.throws(()=>parseBatch(Array.from({length:501},(_,i)=>`SYS-${i}`).join('\n')),/1 y 500/)
})
