import { apiKey } from './config.js';

async function init() {
    try {
        populateCategoryTiles()

        const saveButton = document.getElementById('savePreferencesBtn');
        saveButton.addEventListener('click', saveCategoryPreferences);

        const skipButton = document.getElementById('skipBtn');
        skipButton.addEventListener('click', skipPreferences);

    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

window.onload = function () {
    init()
}

async function getVideoCategories(apiKey) {
    const lastFetchedTimestamp = localStorage.getItem("videoCategoriesTimestamp");
    const currentTime = Date.now();
    const oneMonthInMillis = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    // Check if we already have categories in local storage and if they are less than a month old
    if (lastFetchedTimestamp && (currentTime - lastFetchedTimestamp < oneMonthInMillis)) {
        return JSON.parse(localStorage.getItem("videoCategories"));
    }

    // Fetch categories from YouTube API
    const url = `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    const categories = data.items.map(item => ({
        id: item.id,
        title: item.snippet.title
    }));

    // Store categories and current timestamp in local storage
    localStorage.setItem("videoCategories", JSON.stringify(categories));
    localStorage.setItem("videoCategoriesTimestamp", currentTime.toString());

    return categories;
}

async function populateCategoryTiles() {
    const categories = await getVideoCategories(apiKey);
    const container = document.getElementById('categoriesContainer');

    // Create a fieldset to group the checkboxes
    const fieldset = document.createElement('fieldset');
    container.appendChild(fieldset);

    // Create a legend for the checkbox group
    const legend = document.createElement('legend');
    legend.textContent = 'Select Youtube Categories';
    legend.className = 'checkbox-group-legend';
    fieldset.appendChild(legend);

    categories.forEach(category => {
        const tile = document.createElement('label');
        tile.classList.add('checkbox-tile');
        tile.setAttribute('for', `cat-${category.id}`); // Link the label to the input via the 'for' attribute

        const input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        input.classList.add('checkbox-input');
        input.id = `cat-${category.id}`;

        const span = document.createElement('span');
        span.classList.add('checkbox-icon');
        /*const img = document.createElement('img');
        img.src = `path_to_your_image_for_${category.title}.jpg`; // Replace with your image path logic
        img.alt = category.title;
        img.width = 50;
        img.height = 50;
        span.appendChild(img);*/

        const label = document.createElement('span');
        label.classList.add('checkbox-label');
        label.textContent = category.title;

        fieldset.appendChild(input); // Append input outside of the label but still inside the fieldset
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
            window.location.href = 'https://tykrt.com/home.html';
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
    window.location.href = 'https://tykrt.com/home.html';
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
