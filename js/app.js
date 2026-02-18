document.getElementById('submit-btn').addEventListener('click', async () => {
    const repo = GITHUB_REPO; // Loaded from config.js
    let shortCode = document.getElementById('short-code').value.trim();
    const longUrl = document.getElementById('long-url').value.trim();
    const pat = document.getElementById('pat').value.trim();
    const messageDiv = document.getElementById('message');

    // --- Input validation ---
    if (!shortCode || !longUrl || !pat) {
        showMessage('All fields are required.', 'error');
        return;
    }

    if (repo === 'your-username/your-repo-name') {
        showMessage(
            'Please configure your GitHub repository in js/config.js before continuing.',
            'error'
        );
        return;
    }

    // Ensure leading slash
    if (!shortCode.startsWith('/')) {
        shortCode = '/' + shortCode;
    }

    // Validate URL
    try {
        new URL(longUrl);
    } catch {
        showMessage('The destination URL is not valid.', 'error');
        return;
    }

    const apiUrl = `https://api.github.com/repos/${repo}/contents/data/links.json`;
    const headers = {
        'Authorization': `token ${pat}`,
        'Accept': 'application/vnd.github.v3+json'
    };

    showMessage('Processing request...', 'info');
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;

    try {
        // 1. Fetch existing file (if any)
        let fileSha;
        let currentLinks = {};
        const getResponse = await fetch(apiUrl, { headers });

        if (getResponse.status === 404) {
            console.log('links.json does not exist. A new file will be created.');
        } else if (getResponse.ok) {
            const data = await getResponse.json();
            fileSha = data.sha;
            const content = atob(data.content);
            currentLinks = JSON.parse(content);
        } else {
            throw new Error(`Failed to fetch file: ${getResponse.statusText}`);
        }

        // 2. Update JSON content
        currentLinks[shortCode] = longUrl;
        const updatedContent = JSON.stringify(currentLinks, null, 4);
        const updatedContentBase64 = btoa(updatedContent);

        // 3. Push update to GitHub
        const putResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `feat: add or update short link ${shortCode}`,
                content: updatedContentBase64,
                sha: fileSha
            })
        });

        if (!putResponse.ok) {
            const errorData = await putResponse.json();
            throw new Error(errorData.message || 'Unknown GitHub API error');
        }

        showMessage('Short link successfully added or updated.', 'success');
        document.getElementById('short-code').value = '';
        document.getElementById('long-url').value = '';

    } catch (error) {
        console.error('Operation failed:', error);
        showMessage(`Operation failed: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
    }
});

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = type; // success | error | info
    messageDiv.style.display = 'block';
}

/* -------------------------------
   Random short-code generator
-------------------------------- */

const generateBtn = document.getElementById('generate-btn');
const generatorOptions = document.getElementById('generator-options');
const shortCodeInput = document.getElementById('short-code');

generateBtn.addEventListener('click', () => {
    const isVisible = generatorOptions.style.display === 'block';
    generatorOptions.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
        generateAndSetShortCode();
    }
});

document.getElementById('length').addEventListener('input', generateAndSetShortCode);
document.getElementById('include-uppercase').addEventListener('change', generateAndSetShortCode);
document.getElementById('include-lowercase').addEventListener('change', generateAndSetShortCode);
document.getElementById('include-numbers').addEventListener('change', generateAndSetShortCode);

function generateAndSetShortCode() {
    const length = parseInt(document.getElementById('length').value, 10);
    const includeUppercase = document.getElementById('include-uppercase').checked;
    const includeLowercase = document.getElementById('include-lowercase').checked;
    const includeNumbers = document.getElementById('include-numbers').checked;

    let charset = '';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';

    if (!charset || length <= 0) {
        shortCodeInput.value = '';
        return;
    }

    let result = '';
    for (let i = 0; i < length; i++) {
        const index = Math.floor(Math.random() * charset.length);
        result += charset[index];
    }

    shortCodeInput.value = result;
}
