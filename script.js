import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc, collection, addDoc, onSnapshot, query, orderBy, updateDoc, arrayUnion, arrayRemove 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Configuração exata do Firebase do projeto
const firebaseConfig = {
  apiKey: "AIzaSyC-2IggENJIhqbGSdP5RIefR-VQt1RCT90",
  authDomain: "projetoitaqui-8327c.firebaseapp.com",
  projectId: "projetoitaqui-8327c",
  storageBucket: "projetoitaqui-8327c.firebasestorage.app",
  messagingSenderId: "198412977643",
  appId: "1:198412977643:web:85f02d9d485e6a723f85ae",
  measurementId: "G-KF7GQFMJFC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ADMIN_EMAIL = "babyyoda.yohan@gmail.com";

let currentUser = null;
let userProfile = null;
let currentAuthMode = 'login';
let adminImageBase64 = null;

// Gestão de redirecionamento do Google em telemóveis
getRedirectResult(auth).catch((error) => {
  console.error("Erro no redirecionamento Google:", error);
  if (error.code === 'auth/unauthorized-domain') {
    alert("Atenção: Adicione o seu domínio do GitHub Pages nos 'Domínios Autorizados' no console do Firebase Authentication.");
  }
});

// Funções Globais de UI (Modais e Abas)
window.switchAuthTab = (mode) => {
  currentAuthMode = mode;
  document.getElementById('tab-login-btn').classList.toggle('active', mode === 'login');
  document.getElementById('tab-register-btn').classList.toggle('active', mode === 'register');
  document.querySelector('#auth-submit-btn span').innerText = mode === 'login' ? 'Entrar' : 'Registar';
};

window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

window.previewImage = (e, targetId) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.getElementById(targetId);
      img.src = event.target.result;
      img.style.display = 'block';
      if(targetId === 'admin-img-preview') adminImageBase64 = event.target.result;
    };
    reader.readAsDataURL(file);
  }
};

// Monitoramento de Sessão Ativa
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      userProfile = userDoc.data();
      showMainApp();
    } else {
      if(user.displayName) document.getElementById('onboard-name').value = user.displayName.split(' ')[0];
      if(user.photoURL) document.getElementById('avatar-preview').src = user.photoURL;
      document.getElementById('auth-screen').classList.add('hidden');
      document.getElementById('onboarding-modal').classList.remove('hidden');
    }
  } else {
    currentUser = null;
    userProfile = null;
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('onboarding-modal').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
  }
});

// Autenticação Email/Senha
window.handleAuthSubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const btn = document.getElementById('auth-submit-btn');
  
  if (password.length < 6) {
    alert("A palavra-passe precisa de ter pelo menos 6 caracteres!");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A processar...';

  try {
    if (currentAuthMode === 'login') {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    if (err.code === 'auth/invalid-credential') {
      alert("Erro: Conta não encontrada ou palavra-passe incorreta. Se é a primeira vez, clique em 'Registar'.");
    } else if (err.code === 'auth/email-already-in-use') {
      alert("Este e-mail já está registado. Selecione a aba 'Entrar'.");
    } else if (err.code === 'auth/weak-password') {
      alert("A palavra-passe é demasiado fraca (mínimo de 6 carateres).");
    } else {
      alert("Erro de autenticação: " + err.message);
    }
  }
  btn.disabled = false;
  btn.innerHTML = `<span>${currentAuthMode === 'login' ? 'Entrar' : 'Registar'}</span>`;
};

// Autenticação Google
window.handleGoogleLogin = async () => {
  try {
    await signInWithRedirect(auth, new GoogleAuthProvider());
  } catch (err) {
    alert("Erro ao iniciar sessão com o Google: " + err.message);
  }
};

// Conclusão do Primeiro Acesso (Onboarding)
window.saveOnboarding = async (e) => {
  e.preventDefault();
  const name = document.getElementById('onboard-name').value.trim();
  const dob = document.getElementById('onboard-dob').value;
  let photoSrc = document.getElementById('avatar-preview').src;
  
  if(photoSrc.includes('ui-avatars')) {
    photoSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
  }

  userProfile = {
    firstName: name,
    birthDate: dob,
    photoURL: photoSrc,
    email: currentUser.email,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, "users", currentUser.uid), userProfile);
  document.getElementById('onboarding-modal').classList.add('hidden');
  showMainApp();
};

// Exibir a Aplicação Principal
function showMainApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('onboarding-modal').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');

  document.getElementById('nav-user-name').innerText = userProfile.firstName;
  document.getElementById('nav-user-photo').src = userProfile.photoURL;

  if (currentUser.email === ADMIN_EMAIL) {
    document.getElementById('admin-badge-btn').classList.remove('hidden');
  }
  
  loadDynamicEvents();
  listenToChat();
}

// Gestão de Datas e Eventos (Ontem, Hoje, Amanhã)
function getDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
}

function loadDynamicEvents() {
  const yesterdayStr = getDateStr(-1);
  const todayStr = getDateStr(0);
  const tomorrowStr = getDateStr(1);

  // Rótulos dinâmicos dos dias
  const dYest = new Date(); dYest.setDate(dYest.getDate() - 1);
  const dTom = new Date(); dTom.setDate(dTom.getDate() + 1);
  
  document.getElementById('badge-yesterday-text').innerText = dYest.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  document.getElementById('badge-tomorrow-text').innerText = dTom.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  // Carregar Ontem
  onSnapshot(doc(db, "events", yesterdayStr), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('yesterday-title').innerText = data.title;
      document.getElementById('yesterday-preacher').innerText = data.preacher;
      document.getElementById('yesterday-desc').innerText = data.description || 'Culto encerrado.';
      if (data.image) document.getElementById('yesterday-img').src = data.image;
    } else {
      document.getElementById('yesterday-title').innerText = "Programação Passada";
      document.getElementById('yesterday-preacher').innerText = "-";
    }
  });

  // Carregar Hoje
  onSnapshot(doc(db, "events", todayStr), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('today-title').innerText = data.title;
      document.getElementById('today-type').innerText = data.type;
      document.getElementById('today-preacher').innerText = data.preacher;
      document.getElementById('today-desc').innerText = data.description || '';
      if (data.image) document.getElementById('today-img').src = data.image;
    } else {
      document.getElementById('today-title').innerText = "Nenhum evento publicado para hoje";
      document.getElementById('today-type').innerText = "A aguardar";
      document.getElementById('today-preacher').innerText = "A definir";
      document.getElementById('today-desc').innerText = "O administrador ainda não publicou a programação de hoje.";
    }
  });

  // Carregar Amanhã (Se publicado, remove o cadeado)
  onSnapshot(doc(db, "events", tomorrowStr), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('tomorrow-title').innerText = data.title;
      document.getElementById('tomorrow-preacher').innerText = data.preacher;
      document.getElementById('tomorrow-desc').innerText = data.description || '';
      if (data.image) document.getElementById('tomorrow-img').src = data.image;
      document.getElementById('tomorrow-lock').classList.add('hidden');
    } else {
      document.getElementById('tomorrow-title').innerText = "Próximo Evento";
      document.getElementById('tomorrow-preacher').innerText = "A definir";
      document.getElementById('tomorrow-lock').classList.remove('hidden');
    }
  });
}

// Publicação do Administrador
window.saveAdminEvent = async (e) => {
  e.preventDefault();
  const title = document.getElementById('admin-title').value.trim();
  const type = document.getElementById('admin-type').value;
  const preacher = document.getElementById('admin-preacher').value.trim();
  const desc = document.getElementById('admin-desc').value.trim();

  const eventData = {
    title, type, preacher, description: desc,
    image: adminImageBase64 || "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600",
    updatedAt: new Date().toISOString()
  };

  const btn = e.target.querySelector('button');
  btn.innerText = "A publicar...";
  
  await setDoc(doc(db, "events", getDateStr(0)), eventData);
  
  alert("Programação de hoje publicada com sucesso!");
  btn.innerHTML = '<i class="fa-solid fa-upload"></i> Publicar Programação';
  closeModal('admin-modal');
};

// Chat Comunitário em Tempo Real (Texto, Voz e Curtidas)
function listenToChat() {
  const q = query(collection(db, "chats"), orderBy("timestamp", "asc"));
  
  onSnapshot(q, (snapshot) => {
    const container = document.getElementById('chat-messages');
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
    
    container.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const msgId = docSnap.id;
      const isMine = msg.senderUid === currentUser.uid;
      const liked = msg.likes && msg.likes.includes(currentUser.uid);
      const likesCount = msg.likes ? msg.likes.length : 0;

      const msgDiv = document.createElement('div');
      msgDiv.className = `message-bubble ${isMine ? 'mine' : ''}`;

      let contentHTML = msg.text ? `<div class="msg-text">${msg.text}</div>` : '';
      if (msg.audio) {
        contentHTML += `<audio controls src="${msg.audio}" style="width: 100%; max-width: 250px; height: 35px; margin-top:6px; border-radius: 15px;"></audio>`;
      }

      msgDiv.innerHTML = `
        <div class="msg-header">
          <img class="msg-avatar" src="${msg.senderPhoto}" alt="User">
          <span class="msg-author">${msg.senderName}</span>
        </div>
        ${contentHTML}
        <div class="msg-likes ${liked ? 'liked' : ''}" onclick="toggleLike('${msgId}', ${liked})">
          <i class="fa-solid fa-heart"></i> <span>${likesCount}</span>
        </div>
      `;
      container.appendChild(msgDiv);
    });
    
    if(isAtBottom) container.scrollTop = container.scrollHeight;
  });
}

window.sendTextMessage = async () => {
  const input = document.getElementById('chat-text-input');
  const text = input.value.trim();
  if (!text) return;
  
  input.value = '';
  await addDoc(collection(db, "chats"), {
    text,
    senderUid: currentUser.uid,
    senderName: userProfile.firstName,
    senderPhoto: userProfile.photoURL,
    timestamp: new Date().toISOString(),
    likes: []
  });
  document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
};

window.toggleLike = async (msgId, isLiked) => {
  const msgRef = doc(db, "chats", msgId);
  if (isLiked) {
    await updateDoc(msgRef, { likes: arrayRemove(currentUser.uid) });
  } else {
    await updateDoc(msgRef, { likes: arrayUnion(currentUser.uid) });
  }
};

// Gravação de Mensagem de Voz no Chat
let mediaRecorder = null;
let audioChunks = [];

document.getElementById('mic-btn').addEventListener('click', async () => {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        if(audioChunks.length === 0) return;
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          await addDoc(collection(db, "chats"), {
            audio: reader.result,
            senderUid: currentUser.uid,
            senderName: userProfile.firstName,
            senderPhoto: userProfile.photoURL,
            timestamp: new Date().toISOString(),
            likes: []
          });
        };
        audioChunks = [];
      };
      
      mediaRecorder.start();
      document.getElementById('recording-status').classList.remove('hidden');
    } catch (err) {
      alert("Permita o acesso ao microfone nas definições do seu navegador para enviar áudio.");
    }
  } else {
    mediaRecorder.stop();
    document.getElementById('recording-status').classList.add('hidden');
  }
});

window.cancelRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    audioChunks = [];
    mediaRecorder.stop();
    document.getElementById('recording-status').classList.add('hidden');
  }
};

// Definições e Alteração de Perfil
window.openSettings = () => {
  document.getElementById('settings-avatar').src = userProfile.photoURL;
  document.getElementById('settings-name-display').innerText = userProfile.firstName;
  document.getElementById('settings-email-display').innerText = userProfile.email;
  document.getElementById('settings-name-input').value = userProfile.firstName;
  openModal('settings-modal');
};

window.updateProfileSettings = async (e) => {
  e.preventDefault();
  const newName = document.getElementById('settings-name-input').value.trim();
  const fileInput = document.getElementById('settings-photo-input').files[0];
  
  let newPhoto = userProfile.photoURL;
  if (fileInput) {
    newPhoto = await new Promise(res => {
      const r = new FileReader();
      r.onload = ev => res(ev.target.result);
      r.readAsDataURL(fileInput);
    });
  }

  await updateDoc(doc(db, "users", currentUser.uid), { firstName: newName, photoURL: newPhoto });
  userProfile.firstName = newName;
  userProfile.photoURL = newPhoto;
  
  showMainApp();
  closeModal('settings-modal');
};

window.handleLogout = () => signOut(auth);
