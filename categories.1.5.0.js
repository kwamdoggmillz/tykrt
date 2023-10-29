import { apiKey } from './config.js';

async function init() {
    try {
        if (localStorage.getItem('username')) {
            document.getElementById('intialBackground').style.display = 'none';
            document.querySelector('.mainContainer').style.display = 'block';
            setProfileData();
            populateCategoryTiles()
        } else {
            window.location.href = 'https://tykrt.com';
        }

        const saveButton = document.getElementById('savePreferencesBtn');
        saveButton.addEventListener('click', saveCategoryPreferences);

        /*const skipButton = document.getElementById('skipBtn');
        skipButton.addEventListener('click', skipPreferences);*/

    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

window.onload = function () {
    init()
}

function setProfileData() {
    const username = localStorage.getItem('username');
    document.getElementById("dynamicName").textContent = "";
document.getElementById("dynamicUsername").textContent = '@' + username;
}


const drop = document.querySelector(".drop");
const dropBox = document.querySelector(".drop-box");
var state = false;
drop.addEventListener('click', show);

function show() {
    if (!state) {
        document.querySelector(".drop i").classList.add("active");
        dropBox.classList.add("active");
        state = true;
    } else {
        document.querySelector(".drop i").classList.remove("active");
        dropBox.classList.remove("active");
        state = false;
    }
}

async function getVideoCategories(apiKey) {
    const lastFetchedTimestamp = localStorage.getItem("videoCategoriesTimestamp");
    const currentTime = Date.now();
    const oneMonthInMillis = 30 * 24 * 60 * 60 * 1000;

    if (lastFetchedTimestamp && (currentTime - lastFetchedTimestamp < oneMonthInMillis)) {
        return JSON.parse(localStorage.getItem("videoCategories"));
    }

    const url = `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const categories = data.items.map(item => ({
        id: item.id,
        title: item.snippet.title
    }));

    localStorage.setItem("videoCategories", JSON.stringify(categories));
    localStorage.setItem("videoCategoriesTimestamp", currentTime.toString());

    return categories;
}

async function populateCategoryTiles() {
    let categories = await getVideoCategories(apiKey);

    // Merging logic
    const categoriesMap = {};

    categories.forEach(category => {
        if (category.title === "Comedy" && categoriesMap["Comedy"]) {
            categoriesMap["Comedy"].id.push(category.id);
        } else if (category.title === "Comedy" && !categoriesMap["Comedy"]) {
            categoriesMap["Comedy"] = { id: [category.id], title: "Comedy" };
        } else {
            categoriesMap[category.title] = { id: category.id, title: category.title };
        }
    });

    categories = Object.values(categoriesMap);
    categories.sort((a, b) => a.title.localeCompare(b.title));

    const container = document.getElementById('categoriesContainer');
    const fieldset = document.createElement('fieldset');
    container.appendChild(fieldset);

    const legend = document.createElement('legend');
    legend.textContent = 'Select Youtube Categories';
    legend.className = 'checkbox-group-legend';
    fieldset.appendChild(legend);

    categories.forEach(category => {
        const tile = document.createElement('label');
        tile.classList.add('checkbox-tile');
        const catId = Array.isArray(category.id) ? category.id.join(",") : category.id;

        tile.setAttribute('for', `cat-${catId}`);
        const input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        input.classList.add('checkbox-input');
        input.id = `cat-${catId}`;

        const span = document.createElement('span');
        span.classList.add('checkbox-icon');


        /* Uncomment and modify this section if you have images for the categories
        const img = document.createElement('img');
        img.src = `path_to_your_image_for_${category.title}.jpg`; // Replace with your image path logic
        img.alt = category.title;
        img.width = 50;
        img.height = 50;
        span.appendChild(img);
        */

        const label = document.createElement('span');
        label.classList.add('checkbox-label');
        label.textContent = category.title;

        fieldset.appendChild(input);
        tile.appendChild(span);
        tile.appendChild(label);
        fieldset.appendChild(tile);
    });

    populateUserPreferences();
}


function saveCategoryPreferences() {
    const allCategories = document.querySelectorAll('.checkbox-input');
    const unwantedCategories = [];

    allCategories.forEach(input => {
        if (!input.checked) {
            unwantedCategories.push(input.id.replace('cat-', ''));
        }
    });

    updateUserUnwantedCategoryPreferences(unwantedCategories)
        .then(() => {
            alert('Preferences saved successfully!');
            // Redirect to the home page
            window.location.href = 'https://tykrt.com/index.html';
        })
        .catch(error => {
            alert('Failed to save preferences. Try again later.');
        });
}

function skipPreferences() {
    // Clear unwanted categories since default is all categories
    localStorage.removeItem('unwantedCategories');

    // Notify the user
    alert('Default preferences applied!');

    // Redirect to the home page
    window.location.href = 'https://tykrt.com/index.html';
}

function getUserUnwantedCategories() {
    // Get the unwanted categories from localStorage
    const unwanted = localStorage.getItem('unwantedCategories');

    // If there's no data in localStorage, return an empty array
    if (!unwanted) return [];

    // Parse the string data from localStorage to an array
    return JSON.parse(unwanted);
}

// Example function to update the user's category preferences
async function updateUserUnwantedCategoryPreferences(unwantedCategories) {
    const categoryPreferences = {
        ...unwantedCategories,
        username: localStorage.getItem('username')
    };

    const response = await fetch('https://vps.tykrt.com/app/updateCategoryPreferences', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categoryPreferences }),
    });

    if (!response.ok) {
        throw new Error('Failed to update preferences');
    }
}

async function populateUserPreferences() {
    const username = localStorage.getItem('username');
    try {
        const response = await fetch(`https://vps.tykrt.com/app/getCategoryPreferences?username=${username}`);
        const { unwantedCategories } = await response.json();

        // If there are any unwanted categories stored, proceed to populate
        if (unwantedCategories) {
            const allCategories = document.querySelectorAll('.checkbox-input');

            allCategories.forEach(input => {
                const categoryId = input.id.replace('cat-', '');

                // If the category is not in the unwanted list, check it
                if (!unwantedCategories.includes(categoryId)) {
                    input.checked = true;
                }
            });
        }
    } catch (error) {
        console.error('Failed to load user preferences:', error);
    }
}
