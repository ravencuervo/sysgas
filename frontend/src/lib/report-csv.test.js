import test from 'node:test'
import assert from 'node:assert/strict'
import {reportCsv} from './report-csv.js'
test('exporta cifras y productos sin perder comillas o saltos de línea',()=>{
 const text=reportCsv({ventas_pen:48,productos:[{nombre:'Balón "Familiar"',unidades:1}]},{from:'2026-10-01',to:'2026-10-30'})
 assert.match(text,/ventas_pen/);assert.match(text,/48/);assert.match(text,/""Familiar""/)
})
test('neutraliza fórmulas al abrir el reporte en una hoja de cálculo',()=>{
 assert.match(reportCsv({valor:'=HYPERLINK("x")'},{from:'2026-10-01',to:'2026-10-30'}),/"'=HYPERLINK/)
})
