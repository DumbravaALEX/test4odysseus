const BIN_ID = '6acd648fffd5d16053659b99';
const MASTER_KEY = '$2a$10$rBsXRieW82/yAF/9cK.DyeeIDfOJ.7XAfwfGfHM3OYlRyWBqXH.JC';

const standardSlots = [
    "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00",
    "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00",
    "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00"
];

let bookings = [];

// Rulăm totul doar după ce pagina HTML este complet încărcată
document.addEventListener("DOMContentLoaded", () => {
    initDateSelectors();
    loadBookings();
});

// Inițializare opțiuni Zile, Luni și Ani
function initDateSelectors() {
    const selectZi = document.getElementById('selectZi');
    const selectLuna = document.getElementById('selectLuna');
    const selectAn = document.getElementById('selectAn');

    if (!selectZi || !selectLuna || !selectAn) return;

    // Populare Zile (01 - 31)
    selectZi.innerHTML = '';
    for (let i = 1; i <= 31; i++) {
        let opt = document.createElement('option');
        let ziVal = String(i).padStart(2, '0');
        opt.value = ziVal;
        opt.textContent = ziVal;
        selectZi.appendChild(opt);
    }

    // Populare Ani (Anul curent și următorul)
    selectAn.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y <= currentYear + 1; y++) {
        let opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        selectAn.appendChild(opt);
    }

    // Setare automată la data de azi
    const today = new Date();
    selectZi.value = String(today.getDate()).padStart(2, '0');
    selectLuna.value = String(today.getMonth() + 1).padStart(2, '0');
    selectAn.value = String(today.getFullYear());
}

// Returnează data formatată în șir intern "YYYY-MM-DD" pentru baza de date
function getSelectedDateISO() {
    const selectZi = document.getElementById('selectZi');
    const selectLuna = document.getElementById('selectLuna');
    const selectAn = document.getElementById('selectAn');
    if (!selectZi || !selectLuna || !selectAn) return '';
    return `${selectAn.value}-${selectLuna.value}-${selectZi.value}`;
}

// Returnează data în format vizual "Zi / Lună / An"
function formatDateRO(isoDate) {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
}

// Eveniment declanșat la schimbarea datei
function onDateChange() {
    renderSlots();
}

// Preluare programări din JSONbin.io
async function loadBookings() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': MASTER_KEY
            }
        });
        const data = await response.json();
        if (Array.isArray(data.record)) {
            bookings = data.record;
        } else if (data.record && Array.isArray(data.record.programari)) {
            bookings = data.record.programari;
        } else {
            bookings = [];
        }
        renderSlots();
    } catch (error) {
        console.error("Eroare la preluarea datelor:", error);
        showAlert("Eroare la conectarea cu baza de date cloud.", "error");
    }
}

function renderSlots() {
    const currentDateISO = getSelectedDateISO();
    const dateDisplay = document.getElementById('selectedDateDisplay');
    if (dateDisplay) {
        dateDisplay.textContent = formatDateRO(currentDateISO);
    }
    
    const tableBody = document.getElementById('slotsTableBody');
    const selectOra = document.getElementById('ora_start');
    
    if (!tableBody || !selectOra) return;

    tableBody.innerHTML = '';
    selectOra.innerHTML = '';

    standardSlots.forEach(slot => {
        const found = bookings.find(b => b.data === currentDateISO && b.slot === slot);
        
        const tr = document.createElement('tr');
        if (found) {
            tr.innerHTML = `
                <td><strong>${slot}</strong></td>
                <td><span class="status-badge status-busy">Ocupat în Lucru</span></td>
                <td style="color: var(--text-secondary);">Rezervat de <em>${found.nume}</em></td>
            `;
        } else {
            tr.innerHTML = `
                <td><strong>${slot}</strong></td>
                <td><span class="status-badge status-free">Liber</span></td>
                <td style="color: var(--accent-green);">Disponibil pentru rezervare</td>
            `;
            const opt = document.createElement('option');
            opt.value = slot;
            opt.textContent = `${slot} (Disponibil)`;
            selectOra.appendChild(opt);
        }
        tableBody.appendChild(tr);
    });

    if (selectOra.options.length === 0) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = "Toate sloturile sunt ocupate pentru această dată";
        selectOra.appendChild(opt);
    }
}

async function handleBooking(event) {
    event.preventDefault();
    const numeInput = document.getElementById('nume');
    if (!numeInput) return;

    const nume = numeInput.value.trim();
    const currentDateISO = getSelectedDateISO();
    const slot = document.getElementById('ora_start').value;

    if (!slot) return;

    bookings.push({ nume, data: currentDateISO, slot });

    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': MASTER_KEY
            },
            body: JSON.stringify(bookings)
        });

        if (response.ok) {
            showAlert(`Programare reușită pentru ${formatDateRO(currentDateISO)}, între ${slot}!`, "success");
            numeInput.value = '';
            renderSlots();
        } else {
            showAlert("Eroare la salvarea pe server.", "error");
        }
    } catch (error) {
        console.error("Eroare:", error);
        showAlert("Eroare de rețea la salvare.", "error");
    }
}

function showAlert(message, type) {
    const alertBox = document.getElementById('alertBox');
    if (!alertBox) return;
    alertBox.className = `alert ${type}`;
    alertBox.textContent = message;
    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 5000);
}