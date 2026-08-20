import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { 
  getFirestore, doc, setDoc, getDoc, collection, addDoc, onSnapshot, query, orderBy, updateDoc, arrayUnion, arrayRemove 
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Configuração Firebase
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
let mediaRecorder = null;
let audioChunks = [];

// INICIALIZAÇÃO E MONITORAMENTO DE AUTENTICAÇÃO
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (userDoc.exists()) {
      userProfile = userDoc.data();
      showMainApp();
    } else {
      document.getElementById('onboarding-modal').classList.remove('hidden');
    }
  } else {
    currentUser = null;
    userProfile = null;
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
  }
});

// SUBMIT LOGIN / REGISTRO
window.switchAuthTab = (mode) => {
  currentAuthMode = mode;
  document.getElementById('tab-login-btn').classList.toggle('active', mode === 'login');
  document.getElementById('tab-register-btn').classList.toggle('active', mode === 'register');
  document.querySelector('#auth-submit-btn span').innerText = mode === 'login' ? 'Entrar' : 'Cadastrar';
};

window.handleAuthSubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  try {
    if (currentAuthMode === 'login') {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    alert("Erro de autenticação: " + err.message);
  }
};

window.handleGoogleLogin = async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (err) {
    alert("Erro Google Auth: " + err.message);
  }
};

// ONBOARDING (PRIMEIRO ACESSO)
window.previewImage = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById('avatar-preview').src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
};

window.saveOnboarding = async (e) => {
  e.preventDefault();
  const name = document.getElementById('onboard-name').value;
  const dob = document.getElementById('onboard-dob').value;
  const photoSrc = document.getElementById('avatar-preview').src;

  const profileData = {
    firstName: name,
    birthDate: dob,
    photoURL: photoSrc.startsWith('data:') ? photoSrc : (currentUser.photoURL || 'https://via.placeholder.com/100'),
    email: currentUser.email,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, "users", currentUser.uid), profileData);
  userProfile = profileData;
  document.getElementById('onboarding-modal').classList.add('hidden');
  showMainApp();
};

// SHOWN MAIN APP
function showMainApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');

  // Atualizar UI do Usuário
  document.getElementById('nav-user-name').innerText = userProfile.firstName || 'Membro';
  document.getElementById('nav-user-photo').src = userProfile.photoURL || 'https://via.placeholder.com/40';

  // Verificar se é Admin
  if (currentUser.email === ADMIN_EMAIL) {
    document.getElementById('admin-badge-btn').classList.remove('hidden');
  }

  loadEvents();
  listenToChat();
}

// LÓGICA DE PROGRAMAÇÃO E EVENTOS (CAROUSEL CARDS)
function loadEvents() {
  const todayStr = new Date().toISOString().split('T')[0];
  
  onSnapshot(doc(db, "events", todayStr), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById('today-title').innerText = data.title;
      document.getElementById('today-type').innerText = data.type;
      document.getElementById('today-preacher').innerText = data.preacher;
      document.getElementById('today-desc').innerText = data.description || '';
      if (data.image) document.getElementById('today-img').src = data.image;
      
      document.getElementById('tomorrow-lock').classList.add('hidden');
    } else {
      document.getElementById('today-title').innerText = "Nenhum evento publicado para hoje";
      document.getElementById('today-preacher').innerText = "Aguardando Admin";
      document.getElementById('tomorrow-lock').classList.remove('hidden');
    }
  });
}

// PAINEL ADMIN
window.openAdminModal = () => document.getElementById('admin-modal').classList.remove('hidden');
window.closeAdminModal = () => document.getElementById('admin-modal').classList.add('hidden');

let adminImageBase64 = "";
window.previewAdminImage = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => { adminImageBase64 = event.target.result; };
    reader.readAsDataURL(file);
  }
};

window.saveAdminEvent = async (e) => {
  e.preventDefault();
  const title = document.getElementById('admin-title').value;
  const type = document.getElementById('admin-type').value;
  const preacher = document.getElementById('admin-preacher').value;
  const desc = document.getElementById('admin-desc').value;
  const imgUrlInput = document.getElementById('admin-img-url').value;

  const todayStr = new Date().toISOString().split('T')[0];
  const eventData = {
    title,
    type,
    preacher,
    description: desc,
    image: adminImageBase64 || imgUrlInput || "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600",
    updatedAt: new Date().toISOString()
  };

  await setDoc(doc(db, "events", todayStr), eventData);
  alert("Evento de hoje publicado com sucesso!");
  closeAdminModal();
};

// CHAT DA COMUNIDADE (TEXTO, ÁUDIO E CURTIDAS)
function listenToChat() {
  const q = query(collection(db, "chats"), orderBy("timestamp", "asc"));
  
  onSnapshot(q, (snapshot) => {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const msgId = docSnap.id;
      const isMine = msg.senderUid === currentUser.uid;
      const liked = msg.likes && msg.likes.includes(currentUser.uid);

      const msgDiv = document.createElement('div');
      msgDiv.className = `message-bubble ${isMine ? 'mine' : ''}`;

      let contentHTML = msg.text ? `<p class="msg-text">${msg.text}</p>` : '';
      if (msg.audio) {
        contentHTML += `<audio controls src="${msg.audio}" style="max-width: 200px; margin-top:5px;"></audio>`;
      }

      msgDiv.innerHTML = `
        <div class="msg-header">
          <img class="msg-avatar" src="${msg.senderPhoto || 'https://via.placeholder.com/22'}" alt="User">
          <span class="msg-author">${msg.senderName}</span>
        </div>
        ${contentHTML}
        <div class="msg-likes ${liked ? 'liked' : ''}" onclick="toggleLike('${msgId}', ${liked})">
          <i class="fa-solid fa-heart"></i> <span>${msg.likes ? msg.likes.length : 0}</span>
        </div>
      `;

      container.appendChild(msgDiv);
    });
    container.scrollTop = container.scrollHeight;
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
};

// GRAVAÇÃO DE ÁUDIO DE VOZ
const micBtn = document.getElementById('mic-btn');
micBtn.addEventListener('click', async () => {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          await addDoc(collection(db, "chats"), {
            audio: base64Audio,
            senderUid: currentUser.uid,
            senderName: userProfile.firstName,
            senderPhoto: userProfile.photoURL,
            timestamp: new Date().toISOString(),
            likes: []
          });
        };
      };

      mediaRecorder.start();
      document.getElementById('recording-status').classList.remove('hidden');
    } catch (err) {
      alert("Permissão de microfone negada.");
    }
  } else {
    mediaRecorder.stop();
    document.getElementById('recording-status').classList.add('hidden');
  }
});

window.cancelRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.onstop = null;
    mediaRecorder.stop();
    document.getElementById('recording-status').classList.add('hidden');
  }
};

window.toggleLike = async (msgId, isLiked) => {
  const msgRef = doc(db, "chats", msgId);
  if (isLiked) {
    await updateDoc(msgRef, { likes: arrayRemove(currentUser.uid) });
  } else {
    await updateDoc(msgRef, { likes: arrayUnion(currentUser.uid) });
  }
};

// MODAL CONFIGURAÇÕES E PROFILE
window.openSettingsModal = () => {
  document.getElementById('settings-avatar').src = userProfile.photoURL;
  document.getElementById('settings-name-display').innerText = userProfile.firstName;
  document.getElementById('settings-email-display').innerText = userProfile.email;
  document.getElementById('settings-name-input').value = userProfile.firstName;
  document.getElementById('settings-modal').classList.remove('hidden');
};

window.closeSettingsModal = () => document.getElementById('settings-modal').classList.add('hidden');

window.updateProfileSettings = async (e) => {
  e.preventDefault();
  const newName = document.getElementById('settings-name-input').value;
  const fileInput = document.getElementById('settings-photo-input').files[0];

  let newPhoto = userProfile.photoURL;

  if (fileInput) {
    newPhoto = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.readAsDataURL(fileInput);
    });
  }

  const updatedData = { firstName: newName, photoURL: newPhoto };
  await updateDoc(doc(db, "users", currentUser.uid), updatedData);
  userProfile = { ...userProfile, ...updatedData };

  showMainApp();
  closeSettingsModal();
};

window.handleLogout = () => signOut(auth);
    
