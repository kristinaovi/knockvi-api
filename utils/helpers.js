const { db } = require('./db')
exports.now = () => new Date().toISOString().slice(0,19).replace('T',' ')
exports.insertOrUpdate = async (table,data,userId,idField='id') => {
  if (data[idField]) {
    data.updated_at = exports.now(); data.updated_by = userId
    await db.query(`UPDATE ${table} SET ? WHERE ${idField} = ?`,[data,data[idField]])
    return { id: data[idField] }
  } else {
    data.created_at = exports.now(); data.updated_at = exports.now()
    data.created_by = userId; data.updated_by = userId
    const [r] = await db.query(`INSERT INTO ${table} SET ?`,data)
    return { id: r.insertId }
  }
}
exports.softDelete = async (table,id,userId) =>
  db.query(`UPDATE ${table} SET deleted_at=?,deleted_by=? WHERE id=?`,[exports.now(),userId,id])
exports.buildFilterQuery = (query,prefix='',withTrashed=false) => {
  const filters =[],values=[]
  if(!withTrashed) filters.push(`${prefix}deleted_at IS NULL`)
  for(const [k,v] of Object.entries(query)){
    if(['sort','order','with_trashed'].includes(k)) continue
    if(!v) continue;
    filters.push(`${prefix}${k} = ?`)
    values.push(v)
  }
  return { filterSql:filters.length?` WHERE ${filters.join(' AND ')}`:'', values }
}
exports.applySorting = (query,def='id')=>{
  const c = query.sort||def, o=query.order?.toUpperCase()==='DESC'?'DESC':'ASC'
  return ` ORDER BY ${c} ${o}`
}