let ingredients = []
let editingIndex = -1

const STORAGE_KEY = 'rudy_calc_v1'
const form = document.getElementById('ingredient-form')
const tbody = document.querySelector('#ingredients-table tbody')
const summary = document.getElementById('summary')

form.addEventListener('submit', e => {
  e.preventDefault()
  addIngredient()
})

document.getElementById('calculate').addEventListener('click', ()=> renderSummary())
document.getElementById('clear').addEventListener('click', ()=>{ingredients=[]; saveState(); renderTable(); renderSummary()})

function saveState(){
  const state = {
    ingredients,
    yield: document.getElementById('yield').value,
    currency: document.getElementById('currency').value,
    markup: document.getElementById('markup').value
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY)
  if(!raw) return
  try{
    const s = JSON.parse(raw)
    if(Array.isArray(s.ingredients)){
      ingredients = s.ingredients.map(i=>({
        name: i.name || '',
        usedQuantity: Number(i.usedQuantity) || 0,
        unit: i.unit || 'g',
        totalQuantity: Number(i.totalQuantity) || 1,
        totalUnit: i.totalUnit || 'g',
        price: Number(i.price) || 0
      }))
    }
    if(s.yield !== undefined) document.getElementById('yield').value = s.yield
    if(s.currency !== undefined) document.getElementById('currency').value = s.currency
    if(s.markup !== undefined) document.getElementById('markup').value = s.markup
  }catch(e){
    console.warn('No se pudo cargar estado:', e)
  }
}

function addIngredient(){
  const name = document.getElementById('name').value.trim()
  const usedQuantity = parseFloat(document.getElementById('usedQuantity').value)
  const unit = document.getElementById('unit').value
  const totalQuantity = parseFloat(document.getElementById('totalQuantity').value)
  const totalUnit = document.getElementById('totalUnit').value || 'g'
  const price = parseFloat(document.getElementById('price').value)
  if(!name || isNaN(usedQuantity) || isNaN(totalQuantity) || isNaN(price) || totalQuantity<=0) return alert('Completa los datos correctamente')
  if(!canConvertUnits(unit, totalUnit)) return alert('Las unidades deben ser compatibles (por ejemplo, ml con l o g con kg)')
  const ing = {name, usedQuantity, unit, totalQuantity, totalUnit, price}
  if(editingIndex >= 0){
    ingredients[editingIndex] = ing
    editingIndex = -1
    document.getElementById('addBtn').textContent = 'Agregar ingrediente'
    document.getElementById('cancelEdit').style.display = 'none'
  } else {
    ingredients.push(ing)
  }
  form.reset()
  saveState()
  renderTable()
  renderSummary()
}

const unitConversions = {
  g: {family: 'mass', factor: 1},
  kg: {family: 'mass', factor: 1000},
  oz: {family: 'mass', factor: 28.349523125},
  lb: {family: 'mass', factor: 453.59237},
  ml: {family: 'volume', factor: 1},
  l: {family: 'volume', factor: 1000},
  tsp: {family: 'volume', factor: 5},
  tbsp: {family: 'volume', factor: 15},
  cup: {family: 'volume', factor: 240},
  u: {family: 'count', factor: 1}
}

function canConvertUnits(fromUnit, toUnit){
  return unitConversions[fromUnit]?.family === unitConversions[toUnit]?.family
}

function convertQuantity(quantity, fromUnit, toUnit){
  if(!canConvertUnits(fromUnit, toUnit)) return NaN
  const from = unitConversions[fromUnit]
  const to = unitConversions[toUnit]
  return quantity * from.factor / to.factor
}

function getIngredientCost(ing){
  const packageQuantityInUsedUnit = convertQuantity(ing.totalQuantity, ing.totalUnit, ing.unit)
  if(!packageQuantityInUsedUnit || isNaN(packageQuantityInUsedUnit)) return 0
  return (ing.price / packageQuantityInUsedUnit) * ing.usedQuantity
}

function renderTable(){
  tbody.innerHTML = ''
  const currency = document.getElementById('currency') ? document.getElementById('currency').value || '$' : '$'
  ingredients.forEach((ing, i)=>{
    const costUsed = getIngredientCost(ing)
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${ing.name}</td>
      <td>${ing.usedQuantity}</td>
      <td>${ing.unit}</td>
      <td>${ing.totalQuantity} ${ing.totalUnit || ''}</td>
      <td>${formatMoney(costUsed, currency)}</td>
      <td>
        <button class="edit-btn" data-i="${i}">Editar</button>
        <button class="remove-btn" data-i="${i}">Eliminar</button>
      </td>
    `
    tbody.appendChild(tr)
  })
  Array.from(document.querySelectorAll('.remove-btn')).forEach(btn=>{
    btn.addEventListener('click', ()=>{ingredients.splice(parseInt(btn.dataset.i),1); saveState(); renderTable(); renderSummary()})
  })
  Array.from(document.querySelectorAll('.edit-btn')).forEach(btn=>{
    btn.addEventListener('click', ()=>{startEdit(parseInt(btn.dataset.i))})
  })
}

function startEdit(i){
  const ing = ingredients[i]
  if(!ing) return
  editingIndex = i
  document.getElementById('name').value = ing.name
  document.getElementById('usedQuantity').value = ing.usedQuantity
  document.getElementById('unit').value = ing.unit
  document.getElementById('totalQuantity').value = ing.totalQuantity
  document.getElementById('price').value = ing.price
  document.getElementById('totalUnit').value = ing.totalUnit || 'g'
  document.getElementById('addBtn').textContent = 'Guardar cambios'
  document.getElementById('cancelEdit').style.display = 'inline-block'
  window.scrollTo({top:0,behavior:'smooth'})
}

document.getElementById('cancelEdit').addEventListener('click', ()=>{
  editingIndex = -1
  form.reset()
  document.getElementById('addBtn').textContent = 'Agregar ingrediente'
  document.getElementById('cancelEdit').style.display = 'none'
})

function calculateTotals(){
  let total = 0
  ingredients.forEach(ing=>{
    total += getIngredientCost(ing)
  })
  return total
}

function renderSummary(){
  const totalCost = calculateTotals()
  const yieldVal = parseFloat(document.getElementById('yield').value) || 1
  const currency = document.getElementById('currency').value || '$'
  const markup = parseFloat(document.getElementById('markup').value) || 0

  const costPerUnit = yieldVal>0 ? totalCost / yieldVal : totalCost
  const priceWithMarkup = costPerUnit * (1 + markup/100)

  summary.innerHTML = `
    <div class="small">Costo total ingredientes: <strong>${formatMoney(totalCost, currency)}</strong></div>
    <div class="small">Costo por unidad/porción: <strong>${formatMoney(costPerUnit, currency)}</strong></div>
    <div class="small">Precio final sugerido (con ${markup}%): <strong>${formatMoney(priceWithMarkup, currency)}</strong></div>
  `
  saveState()
}

function formatMoney(v, currency='$'){
  if(isNaN(v)) v=0
  const amount = (Math.round(v*100)/100).toFixed(2)
  const cur = (currency || '').toString()
  // Prefix when dollar or USD
  if(cur.includes('$') || cur.toUpperCase().includes('USD')){
    // If user entered just 'USD', show '$' prefix
    const symbol = cur.includes('$') ? cur : '$'
    return symbol + amount
  }
  // Default: suffix with currency string
  return amount + ' ' + cur
}

// load saved state and initial render
loadState()
renderTable()
renderSummary()
