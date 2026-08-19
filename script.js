let ingredients = []

const form = document.getElementById('ingredient-form')
const tbody = document.querySelector('#ingredients-table tbody')
const summary = document.getElementById('summary')

form.addEventListener('submit', e => {
  e.preventDefault()
  addIngredient()
})

document.getElementById('calculate').addEventListener('click', ()=> renderSummary())
document.getElementById('clear').addEventListener('click', ()=>{ingredients=[]; renderTable(); renderSummary()})

function addIngredient(){
  const name = document.getElementById('name').value.trim()
  const usedQuantity = parseFloat(document.getElementById('usedQuantity').value)
  const unit = document.getElementById('unit').value
  const totalQuantity = parseFloat(document.getElementById('totalQuantity').value)
  const price = parseFloat(document.getElementById('price').value)
  if(!name || isNaN(usedQuantity) || isNaN(totalQuantity) || isNaN(price) || totalQuantity<=0) return alert('Completa los datos correctamente')

  const ing = {name, usedQuantity, unit, totalQuantity, price}
  ingredients.push(ing)
  form.reset()
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
      <td>${formatMoney(costUsed)}</td>
      <td><button class="remove-btn" data-i="${i}">Eliminar</button></td>
    `
    tbody.appendChild(tr)
  })
  Array.from(document.querySelectorAll('.remove-btn')).forEach(btn=>{
    btn.addEventListener('click', ()=>{ingredients.splice(parseInt(btn.dataset.i),1); renderTable(); renderSummary()})
  })
}

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
}

function formatMoney(v, currency='€'){
  if(isNaN(v)) v=0
  return (Math.round(v*100)/100).toFixed(2) + ' ' + currency
}

// initial render
renderTable()
renderSummary()
