// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyAXh_Vc8dj3vqPhWWHgM4i70ArqeYfDJXA',
  authDomain: 'flight-ad3eb.firebaseapp.com',
  projectId: 'flight-ad3eb',
  storageBucket: 'flight-ad3eb.firebasestorage.app',
  messagingSenderId: '221626771101',
  appId: '1:221626771101:web:47e86ba13083a01c57d674',
  measurementId: 'G-9C6GW1LKGV',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
