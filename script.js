const menu=document.querySelector('.menu-btn');
const nav=document.querySelector('nav');
menu.addEventListener('click',()=>nav.classList.toggle('open'));

document.querySelector('#loginForm').addEventListener('submit',function(e){
  e.preventDefault();
  document.querySelector('#loginMessage').textContent =
    'Student portal connection is not configured yet. This demo is ready to connect to a free database such as Supabase.';
});

const registerBtn=document.querySelector('#registerBtn');
if(registerBtn){
  registerBtn.addEventListener('click',()=>{
    document.querySelector('#loginMessage').textContent='Online registration will be enabled when the free student database is connected.';
  });
}
