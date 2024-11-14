class NumerologyCalculator {
    constructor() {
        this.lang = getCurrentLanguage();
        this.numerologyMeanings = translations[this.lang];
        this.initializeEventListeners();
        this.setupDateInput();
    }

    setupDateInput() {
        const dateInput = document.getElementById('birthDate');
        
        dateInput.addEventListener('change', (e) => {
            if (!e.target.value) return; // If no date is selected, do nothing
            
            const selectedDate = new Date(e.target.value);
            if (isNaN(selectedDate.getTime())) return; // Invalid date

            const day = String(selectedDate.getDate()).padStart(2, '0');
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const year = selectedDate.getFullYear();

            // Store the original value for calculations
            const originalFormat = `${year}-${month}-${day}`;
            e.target.setAttribute('data-value', originalFormat);

            // Keep the input in date type and its value
            e.target.type = 'date';
            e.target.value = originalFormat;
        });
    }

    calculateLifePathNumber(birthDate) {
        try {
            const date = new Date(birthDate);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear());
            
            const dateStr = year + month + day;
            let sum = 0;
            for (let digit of dateStr) {
                sum += parseInt(digit);
            }
            return this.reduceToSingleDigit(sum);
        } catch (error) {
            console.error('Error calculating life path number:', error);
            return null;
        }
    }

    calculateDestinyNumber(fullName) {
        const numerologyValues = {
            'a': 1, 'j': 1, 's': 1,
            'b': 2, 'k': 2, 't': 2,
            'c': 3, 'l': 3, 'u': 3,
            'd': 4, 'm': 4, 'v': 4,
            'e': 5, 'n': 5, 'w': 5,
            'f': 6, 'o': 6, 'x': 6,
            'g': 7, 'p': 7, 'y': 7,
            'h': 8, 'q': 8, 'z': 8,
            'i': 9, 'r': 9
        };

        const name = fullName.toLowerCase().replace(/[^a-z]/g, '');
        let sum = 0;
        
        for (let char of name) {
            sum += numerologyValues[char] || 0;
        }
        
        return this.reduceToSingleDigit(sum);
    }

    reduceToSingleDigit(number) {
        if (number === 11 || number === 22 || number === 33) {
            return number;
        }
        
        while (number > 9) {
            number = String(number).split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
        }
        
        return number;
    }

    calculateNumbers() {
        const fullName = document.getElementById('fullName').value;
        const birthDateInput = document.getElementById('birthDate');
        
        if (!birthDateInput.value) {
            alert(this.lang === 'tr' ? 'Lütfen bir tarih seçin' : 'Please select a date');
            return;
        }

        const lifePathNumber = this.calculateLifePathNumber(birthDateInput.value);
        if (lifePathNumber === null) {
            alert(this.lang === 'tr' ? 'Geçersiz tarih' : 'Invalid date');
            return;
        }

        const destinyNumber = this.calculateDestinyNumber(fullName);
        this.displayResults({
            lifePath: lifePathNumber,
            destiny: destinyNumber
        });
    }

    formatDateTR(dateStr) {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    displayResults(numbers) {
        const results = document.getElementById('results');
        results.classList.remove('hidden');
        results.classList.add('visible');

        // Update Life Path Number
        const lifePathCard = results.querySelector('.life-path');
        lifePathCard.querySelector('.number').textContent = numbers.lifePath;
        lifePathCard.querySelector('.meaning').textContent = 
            this.numerologyMeanings.lifePath[numbers.lifePath];

        // Update Destiny Number
        const destinyCard = results.querySelector('.destiny');
        destinyCard.querySelector('.number').textContent = numbers.destiny;
        destinyCard.querySelector('.meaning').textContent = 
            this.numerologyMeanings.destiny[numbers.destiny];

        // Calculate and display Soul Urge Number
        const soulUrgeNumber = this.calculateSoulUrgeNumber(document.getElementById('fullName').value);
        const soulUrgeCard = results.querySelector('.soul-urge');
        soulUrgeCard.querySelector('.number').textContent = soulUrgeNumber;
        soulUrgeCard.querySelector('.meaning').textContent = 
            this.numerologyMeanings.soulUrge[soulUrgeNumber];

        // Calculate and display Personality Number
        const personalityNumber = this.calculatePersonalityNumber(document.getElementById('fullName').value);
        const personalityCard = results.querySelector('.personality');
        personalityCard.querySelector('.number').textContent = personalityNumber;
        personalityCard.querySelector('.meaning').textContent = 
            this.numerologyMeanings.personality[personalityNumber];

        // Add animation effects
        results.querySelectorAll('.result-card').forEach(card => {
            card.style.animation = 'fadeIn 0.5s ease-in';
        });
    }

    initializeEventListeners() {
        const form = document.getElementById('numerologyForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateNumbers();
        });
    }

    calculateSoulUrgeNumber(fullName) {
        const vowels = {
            'a': 1, 'e': 5, 'i': 9, 'o': 6, 'u': 3,
            'y': 7, // Y is considered a vowel when no other vowel is present in the syllable
            'á': 1, 'é': 5, 'í': 9, 'ó': 6, 'ú': 3, // Accented vowels
            'â': 1, 'ê': 5, 'î': 9, 'ô': 6, 'û': 3,
            'ä': 1, 'ë': 5, 'ï': 9, 'ö': 6, 'ü': 3
        };

        const name = fullName.toLowerCase();
        let sum = 0;
        let hasVowel = false;

        for (let char of name) {
            if (vowels[char]) {
                sum += vowels[char];
                hasVowel = true;
            }
        }

        // Handle Y as a vowel only if no other vowels are present
        if (!hasVowel && name.includes('y')) {
            sum += 7; // Value for Y
        }

        return this.reduceToSingleDigit(sum);
    }

    calculatePersonalityNumber(fullName) {
        const consonants = {
            'b': 2, 'c': 3, 'd': 4, 'f': 6, 'g': 7, 'h': 8, 'j': 1,
            'k': 2, 'l': 3, 'm': 4, 'n': 5, 'p': 7, 'q': 8, 'r': 9,
            's': 1, 't': 2, 'v': 4, 'w': 5, 'x': 6, 'z': 8
        };

        const name = fullName.toLowerCase();
        let sum = 0;

        for (let char of name) {
            if (consonants[char]) {
                sum += consonants[char];
            }
        }

        return this.reduceToSingleDigit(sum);
    }
}

// Initialize the calculator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new NumerologyCalculator();
}); 