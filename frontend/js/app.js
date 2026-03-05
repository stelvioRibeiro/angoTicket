const API = "http://localhost:3000/api";
let token = localStorage.getItem("token");

// ================= REGISTER =================
async function register() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({name,email,password})
  });

  const data = await res.json();
  alert(data.message || "Conta criada!");
  window.location.href="login.html";
}

// ================= LOGIN =================
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/auth/login`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({email,password})
  });

  const data = await res.json();

  if(data.token){
    localStorage.setItem("token",data.token);
    window.location.href="dashboard.html";
  }else{
    alert(data.msg);
  }
}

// ================= LOGOUT =================
function logout(){
  localStorage.removeItem("token");
  window.location.href="index.html";
}

// ================= LOAD EVENTS =================
async function loadEvents(city=""){
  const res = await fetch(`${API}/events?city=${city}`);
  const events = await res.json();

  const container = document.getElementById("eventsContainer");
  if(!container) return;

  container.innerHTML="";

  events.forEach(event=>{
    container.innerHTML += `
      <div class="card">
        <img src="${event.image || 'https://via.placeholder.com/400x200'}" />
        <h3>${event.title}</h3>
        <p>${event.city}</p>
        <p>${event.price} Kz</p>
        <button onclick="buyTicket(${event.id})">Comprar</button>
      </div>
    `;
  });
}

// ================= BUY =================
async function buyTicket(event_id){
  const res = await fetch(`${API}/tickets/buy`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization": token
    },
    body: JSON.stringify({event_id})
  });

  const data = await res.json();
  alert("Referência: "+data.reference);
  window.open(data.qr);
}

// ================= CREATE EVENT =================
async function createEvent(){
  const formData = new FormData();
  formData.append("title",document.getElementById("title").value);
  formData.append("city",document.getElementById("city").value);
  formData.append("price",document.getElementById("price").value);
  formData.append("date",document.getElementById("date").value);
  formData.append("image",document.getElementById("image").files[0]);

  await fetch(`${API}/events/create`,{
    method:"POST",
    headers:{ "Authorization": token },
    body: formData
  });

  alert("Evento criado!");
  loadMyEvents();
}

// ================= DASHBOARD STATS =================
async function loadStats(){
  const res = await fetch(`${API}/admin/stats`,{
    headers:{ "Authorization": token }
  });
  const data = await res.json();

  const ctx = document.getElementById("chart");
  new Chart(ctx,{
    type:"bar",
    data:{
      labels:["Usuários","Eventos","Ingressos"],
      datasets:[{
        label:"Estatísticas",
        data:[data.users,data.events,data.tickets]
      }]
    }
  });
}