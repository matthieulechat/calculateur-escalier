const fs = require('fs')
;(async () => {
  const { LibreDwg, Dwg_File_Type } = await import('@mlightcad/libredwg-web')
  const lib = await LibreDwg.create('./node_modules/@mlightcad/libredwg-web/wasm/')
  const buf = fs.readFileSync(process.argv[2])
  const d = lib.dwg_read_data(buf, Dwg_File_Type.DWG)
  const db = lib.convert(d)
  fs.writeFileSync('db.json', JSON.stringify(db, (k, v) => typeof v === 'bigint' ? Number(v) : v, 1))
  const ents = db.entities
  const types = {}
  ents.forEach(e => { const k = e.type + '|' + e.layer; types[k] = (types[k] || 0) + 1 })
  console.log(types)
  console.log(Object.keys(db.tables))
})()
