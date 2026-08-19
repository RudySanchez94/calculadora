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

function renderTable(){
  tbody.innerHTML = ''
  ingredients.forEach((ing, i)=>{
    const costPerUnit = ing.price / ing.totalQuantity
    const costUsed = costPerUnit * ing.usedQuantity
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${ing.name}</td>
      <td>${ing.usedQuantity}</td>
      <td>${ing.unit}</td>
      <td>${ing.totalQuantity} ${ing.totalUnit || ''}</td>
      <td>${formatMoney(costUsed)}</td>
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
    const costPerUnit = ing.price / ing.totalQuantity
    total += costPerUnit * ing.usedQuantity
  })
  return total
}

function renderSummary(){
  const totalCost = calculateTotals()
  const yieldVal = parseFloat(document.getElementById('yield').value) || 1
  const currency = document.getElementById('currency').value || '€'
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

function formatMoney(v, currency='€'){
  if(isNaN(v)) v=0
  return (Math.round(v*100)/100).toFixed(2) + ' ' + currency
}

// load saved state and initial render
loadState()
renderTable()
renderSummary()
