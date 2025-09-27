// Fichier: script.js
// Logique de connexion et de commande MQTT

// --- Configuration HiveMQ Cloud ---
// Host spécifique à votre cluster HiveMQ Cloud : 6cf3cc66c63e4c91a8a9d6e474192e6b.s1.eu.hivemq.cloud
const HOST = '6cf3cc66c63e4c91a8a9d6e474192e6b.s1.eu.hivemq.cloud'; 
const PORT = 8884; // Port Websocket TLS (WSS) 
const PATH = "/mqtt"; // Chemin par défaut

// --- IDENTIFIANTS FINAUX HIVEMQ ---
const USERNAME = 'Isosagna';   
const PASSWORD = 'Isosagna123'; 

const CLIENT_ID = 'WebClient-' + Math.random().toString(16).substr(2, 8); 

// Topics (doivent correspondre exactement à ceux de l'ESP32)
const TOPIC_COMMANDE = "porte/commande";
const TOPIC_ETAT = "porte/status";

// Création du client Paho MQTT
let client = new Paho.MQTT.Client(HOST, PORT, PATH, CLIENT_ID);

// -------------------------------------------------------------------
// Fonctions d'Interface Utilisateur (Utilise les classes CSS du style Néon)
// -------------------------------------------------------------------

function updateMqttStatus(statusText, className) {
    const statusElement = document.getElementById('mqtt-status');
    statusElement.textContent = statusText;
    statusElement.className = className;
}

function updateDoorStatus(statusText) {
    const statusElement = document.getElementById('door-status');
    statusElement.textContent = statusText;
    
    // Suppression de toutes les classes d'état de porte précédentes
    statusElement.classList.remove('door-ouverte', 'door-fermee', 'door-unknown');
    
    // Application de la classe correspondant au nouvel état (définie dans index.html)
    if (statusText === 'OUVERTE') {
        statusElement.classList.add('door-ouverte');
    } else if (statusText === 'FERMEE') {
        statusElement.classList.add('door-fermee');
    } else {
        // Pour les statuts NEUTRE, EN COURS, ou INCONNU
        statusElement.classList.add('door-unknown'); 
    }
}

// -------------------------------------------------------------------
// Gestion des Événements MQTT
// -------------------------------------------------------------------

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("Perte de connexion: " + responseObject.errorMessage);
        updateMqttStatus('DÉCONNECTÉ', 'status-disconnected');
    }
}

function onMessageArrived(message) {
    const topic = message.destinationName;
    const payload = message.payloadString;
    console.log("Message reçu - Topic: " + topic + ", Payload: " + payload);

    if (topic === TOPIC_ETAT) {
        updateDoorStatus(payload);
    }
}

// -------------------------------------------------------------------
// Connexion au Broker
// -------------------------------------------------------------------

function connectToMqtt() {
    updateMqttStatus('CONNEXION...', 'status-connecting');
    client.connect({
        onSuccess: onConnect,
        onFailure: onFailure,
        userName: USERNAME,
        password: PASSWORD,
        useSSL: true // Utilisation du WSS (WebSocket Secure) pour le port 8884
    });
}

function onConnect() {
    console.log("Connecté à HiveMQ via WSS.");
    updateMqttStatus('CONNECTÉ', 'status-connected');
    // S'abonne au topic de statut pour recevoir l'état actuel de la porte
    client.subscribe(TOPIC_ETAT, { qos: 1 });
}

function onFailure(error) {
    console.error("Échec de la connexion MQTT: ", error);
    updateMqttStatus('ÉCHEC', 'status-disconnected');
    // Tente de se reconnecter après 5 secondes
    setTimeout(connectToMqtt, 5000); 
}

// -------------------------------------------------------------------
// Fonctions de Commande (Publication)
// -------------------------------------------------------------------

function publishCommand(command) {
    if (!client.isConnected()) {
        console.error("Erreur: Client MQTT déconnecté. Impossible d'envoyer la commande.");
        return;
    }
    const message = new Paho.MQTT.Message(command);
    message.destinationName = TOPIC_COMMANDE;
    message.qos = 1; 
    client.send(message);
    console.log("Commande publiée: " + command + " sur " + TOPIC_COMMANDE);
}

// -------------------------------------------------------------------
// Initialisation
// -------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Événements des boutons de commande
    document.getElementById('open-btn').addEventListener('click', () => {
        // Envoie 'OUVRIR'
        publishCommand("OUVRIR");
    });

    document.getElementById('close-btn').addEventListener('click', () => {
        // Envoie 'FERMER'
        publishCommand("FERMER");
    });
    
    document.getElementById('stop-btn').addEventListener('click', () => {
        // Envoie 'STOP' pour la position neutre (90°)
        publishCommand("STOP");
    });

    // Démarre la connexion MQTT au chargement de la page
    connectToMqtt();
});
