import { clientId, redirectUri, scope } from './config.js';

let accessToken = null;

async function init() {
    try {
        accessToken = localStorage.getItem('accessToken');
        const signinButton = document.getElementById('signinButton');
        signinButton.addEventListener('click', signin);

        const signupButton = document.getElementById('signupButton');
        signupButton.addEventListener('click', signup);
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

// Function to handle Twitch signin button click
async function signin() {

    const signinUsername = document.querySelector('input[name="signinUsername"]').value;
    const signinPassword = document.querySelector('input[name="signinPassword"]').value;

    const userData = {
        signinUsername: signinUsername,
        signinPassword: signinPassword
    }

    const response = await fetch('https://vps.tykrt.com/app/signin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    });
    
    if (response.ok) {
        const data = await response.json();
        // Storing accessToken and username in localStorage
        localStorage.setItem('username', data.username);
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('email', data.email);
    
        window.location.href = 'https://tykrt.com/index.html';
    } else {
        console.error('Sign-in failed:', await response.text());
        // Handle errors or provide feedback to user
    }
    
}

async function signup() {

    const username = document.querySelector('input[name="username"]').value;
    const password = document.querySelector('input[name="password"]').value;
    const email = document.querySelector('input[name="email"]').value;

    const userData = {
        username: username,
        password: password,
        email: email
    };

    const response = await fetch('https://vps.tykrt.com/app/signup', { // replace with your server endpoint
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    });

    if (response.ok) {
        localStorage.setItem('username', username);
        localStorage.setItem('email', email);
        window.location.href = 'https://tykrt.com/connect.html';
    } else {
        const errorResponse = await response.json();
        if (errorResponse.error === 'Username or email already exists') {
            alert('Username or email already exists');
        } else {
            console.error('Sign-up failed:', errorResponse.error);
            // Handle other errors or provide feedback to user
        }
    }

}

window.onload = function () {
    init()
}

let switchCtn = document.querySelector("#switch-cnt");
let switchC1 = document.querySelector("#switch-c1");
let switchC2 = document.querySelector("#switch-c2");
let switchCircle = document.querySelectorAll(".switch__circle");
let switchBtn = document.querySelectorAll(".switch-btn");
let aContainer = document.querySelector("#a-container");
let bContainer = document.querySelector("#b-container");
let allButtons = document.querySelectorAll(".submit");

let getButtons = (e) => e.preventDefault()

let changeForm = (e) => {

    switchCtn.classList.add("is-gx");
    setTimeout(function () {
        switchCtn.classList.remove("is-gx");
    }, 1500)

    switchCtn.classList.toggle("is-txr");
    switchCircle[0].classList.toggle("is-txr");
    switchCircle[1].classList.toggle("is-txr");

    switchC1.classList.toggle("is-hidden");
    switchC2.classList.toggle("is-hidden");
    aContainer.classList.toggle("is-txl");
    bContainer.classList.toggle("is-txl");
    bContainer.classList.toggle("is-z200");
}

let mainF = (e) => {
    for (var i = 0; i < allButtons.length; i++)
        allButtons[i].addEventListener("click", getButtons);
    for (var i = 0; i < switchBtn.length; i++)
        switchBtn[i].addEventListener("click", changeForm)
}

window.addEventListener("load", mainF);
