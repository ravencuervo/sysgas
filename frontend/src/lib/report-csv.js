function cell(value) {
 const text=String(value??'')
 const safe=/^[=+@\-\t\r]/.test(text)?`'${text}`:text
 return `"${safe.replaceAll('"','""')}"`
}
export function reportCsv(report,period) {
 const rows=[['Periodo desde',period.from],['Periodo hasta',period.to],['Métrica','Valor']]
 for(const [key,value] of Object.entries(report)) {
  if(Array.isArray(value)) {
   for(const row of value) rows.push([key,Object.entries(row).map(([name,v])=>`${name}: ${v}`).join(' · ')])
  } else rows.push([key,value])
 }
 return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')
}
