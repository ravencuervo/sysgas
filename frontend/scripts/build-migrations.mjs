import { readFile,readdir,writeFile } from 'node:fs/promises'
const root=new URL('../../supabase/',import.meta.url)
const dir=new URL('migrations/',root)
const parts=[]
for(const file of (await readdir(dir)).filter(n=>/^2026103000(0[3-9]|1\d)_.*\.sql$/.test(n)).sort()) {
 const sql=await readFile(new URL(file,dir),'utf8')
 parts.push(`-- ${file}\n${sql.split(/\r?\n/).filter(line=>!['begin;','commit;'].includes(line.trim().toLowerCase())).join('\n')}`)
}
await writeFile(new URL('ACTUALIZAR_SYSGAS.sql',root),`-- SYSGAS: ejecutar tras respaldo y después de las migraciones 001 y 002.
-- No borra tablas ni registros. Reemplaza funciones y políticas operativas.
-- Las empresas necesitan un pago de membresía verificado para operar.
begin;

${parts.join('\n\n')}
commit;
`)
console.log(`Instalador actualizado: ${parts.length} migraciones incluidas.`)
