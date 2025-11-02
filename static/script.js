/* ===== CONFIG (from script.js) ===== */
const USE_APPS_SCRIPT = true; // true -> browser calls Apps Script exec URL directly. false -> use Flask proxy (BASE_API)
const APPS_SCRIPT_EXEC_URL = "https://script.google.com/macros/s/AKfycbx7DDbFYehMzL50uZ6MQF3yZUdqogPIfeB3yzIZ8JeO4nxSJ5tcKXbnj_3UWGealrGnOA/exec"; // <-- set if USE_APPS_SCRIPT=true
const API_KEY = ""; // optional if you enable REQUIRE_API_KEY in Apps Script
const BASE_API = window.location.origin || "http://127.0.0.1:5000";

/* ===== GLOBAL VARIABLES (from chat.js) ===== */
let phoneVerified = false; // Note: This is now managed by wireOtpVerification
let isRecording = false;
let recognition = null;

/* ===== HELPERS (from script.js + chat.js) ===== */
function $id(id) {
  return document.getElementById(id);
}
function log(...a) {
  console.log("[CM]", ...a);
}
function warn(...a) {
  console.warn("[CM]", ...a);
}
function err(...a) {
  console.error("[CM]", ...a);
}
function createOpt(val, text) {
  const o = document.createElement("option");
  o.value = val;
  o.text = text === undefined ? val : text;
  return o;
}

function safeFetchJson(url) {
  return fetch(url, { method: "GET", cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .catch((e) => {
      err("Fetch failed:", url, e);
      return null;
    });
}

/**
 * Shows a toast notification.
 * @param {string} message The message to display.
 * @param {string} type 'success' or 'error'
 */
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icon = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";
  toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideInRight 0.3s ease reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ===== SIDEBAR (from chat.js) ===== */
function initializeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("toggleSidebar");
  const closeBtn = document.getElementById("closeSidebar");

  if (!sidebar || !toggleBtn || !closeBtn) {
    warn("Sidebar elements not found");
    return;
  }

  // This listener opens/closes the sidebar
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  // This listener closes the sidebar
  closeBtn.addEventListener("click", () => {
    sidebar.classList.remove("active");
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768) {
      // Check if the click is NOT the toggle button and NOT inside the sidebar
      if (!toggleBtn.contains(e.target) && !sidebar.contains(e.target)) {
        sidebar.classList.remove("active");
      }
    }
  });
}

/* ===== NAVIGATION (from chat.js) ===== */
function initializeNavigation() {
  const menuItems = document.querySelectorAll(".menu-item");
  const sections = document.querySelectorAll(".section");

  if (menuItems.length === 0 || sections.length === 0) {
    warn("Navigation elements not found");
    return;
  }

  menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const sectionId = item.getAttribute("data-section");
      if (!sectionId) return;

      const targetSection = document.getElementById(`${sectionId}-section`);
      if (!targetSection) {
        warn(`Section not found: ${sectionId}-section`);
        return;
      }

      // Update active menu item
      menuItems.forEach((mi) => mi.classList.remove("active"));
      item.classList.add("active");

      // Show corresponding section
      sections.forEach((section) => {
        section.classList.remove("active");
      });
      targetSection.classList.add("active");

      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        document.getElementById("sidebar")?.classList.remove("active");
      }

      // Scroll to top
      scrollToTop();
    });
  });
}

/* ===== CHAT FUNCTIONALITY (from chat.js) ===== */
function initializeChat() {
  const startChatBtn = document.getElementById("startChatBtn");
  const chatBtn = document.getElementById("chatBtn");
  const chatModal = document.getElementById("chatModal");
  const closeChatBtn = document.getElementById("closeChatBtn");
  const sendBtn = document.getElementById("sendBtn");
  const chatInput = document.getElementById("chatInput");
  const micBtn = document.getElementById("micBtn");

  if (!chatModal) {
    warn("Chat elements not found");
    return;
  }

  const openChat = () => {
    chatModal.classList.add("active");
    if (document.getElementById("chatMessages").children.length === 0) {
      addMessage("Hello! I'm ChikitsaMitra. How can I help you today?", "ai");
      speakText("Hello! I'm ChikitsaMitra. How can I help you today?");
    }
  };

  chatBtn.addEventListener("click", openChat);
  startChatBtn.addEventListener("click", openChat);

  closeChatBtn.addEventListener("click", () => {
    chatModal.classList.remove("active");
  });

  chatModal.addEventListener("click", (e) => {
    if (e.target === chatModal) {
      chatModal.classList.remove("active");
    }
  });

  sendBtn.addEventListener("click", () => sendMessage());

  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  micBtn.addEventListener("click", toggleRecording);
}

function addMessage(text, sender) {
  const messagesContainer = document.getElementById("chatMessages");
  if (!messagesContainer) return;
  const messageDiv = document.createElement("div");
  messageDiv.className = `message message-${sender}`;
  messageDiv.textContent = text;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
  const messagesContainer = document.getElementById("chatMessages");
  if (!messagesContainer) return;
  const typingDiv = document.createElement("div");
  typingDiv.className = "typing-indicator";
  typingDiv.id = "typing";
  typingDiv.textContent = "Typing...";
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
  const typing = document.getElementById("typing");
  if (typing) typing.remove();
}

function sendMessage() {
  const input = document.getElementById("chatInput");
  if (!input) return;
  const message = input.value.trim();

  if (!message) return;

  addMessage(message, "user");
  input.value = "";

  showTypingIndicator();

  // Simulate AI response
  setTimeout(() => {
    removeTypingIndicator();
    const response = getAIResponse(message);
    addMessage(response, "ai");
    speakText(response);
  }, 1000);
}

// ===== START: CHATBOT KNOWLEDGE BASE (from chat.js) =====
const knowledgeBase = {
  // Greetings & Meta
  "hello,hi,hey":
    "Hello! I'm here to help with your health questions. What would you like to know?",
  "thanks,thank you":
    "You're welcome! Is there anything else I can help you with?",
  "bye,goodbye": "Goodbye! Stay healthy.",
  "what is chikitsamitra,who are you":
    "I am ChikitsaMitra, your AI Health Companion. I can provide general health guidance, answer your questions, and help you book appointments. Please remember, I am not a substitute for a real doctor.",
  "symptoms,i feel sick":
    "I can try to provide general information based on symptoms. Please describe how you are feeling. However, for a proper diagnosis, it is always best to consult a healthcare professional.",

  // Original Queries
  "fever,temperature,high temp":
    "For fever, ensure you stay hydrated, rest well, and monitor your temperature. If it persists beyond 3 days or exceeds 103°F (39.4°C), please consult a doctor.",
  "headache,migraine,head hurts":
    "For headaches, try resting in a quiet, dark room, staying hydrated, and using a cold compress. If severe or persistent, please consult a healthcare provider.",
  "appointment,book,schedule":
    "You can book hospital appointments through the 'Appointments' section in the main menu. Just fill in your details and select your preferred time slot.",
  "cold,cough,sore throat,runny nose":
    "For common cold and cough, get plenty of rest, stay hydrated, and consider warm liquids like tea with honey. If symptoms worsen or persist beyond a week, consult a doctor.",
  "stomach ache,stomach pain,belly hurts":
    "For a mild stomach ache, try sipping water or a clear, non-caffeinated beverage. Avoid solid foods for a few hours. If the pain is severe or constant, seek medical attention.",
  "diarrhea,loose motion":
    "For diarrhea, drink plenty of fluids like water, broth, or an oral rehydration solution (ORS) to prevent dehydration. Stick to a bland diet (like bananas, rice, applesauce, toast). See a doctor if it's severe or lasts more than two days.",
  "constipation,can't poop":
    "To relieve constipation, increase your fiber intake with fruits and vegetables, drink plenty of water, and try to get some exercise. If it's a persistent problem, consult a doctor.",
  "nausea,vomiting,throwing up,puking":
    "If you are feeling nauseous, try sipping clear fluids, avoiding strong smells, and eating small, bland meals. If vomiting persists for more than 24 hours or you see blood, see a doctor.",
  "sprain,strain,twisted ankle,pulled muscle":
    "For sprains and strains, follow the R.I.C.E. principle: Rest, Ice (20 minutes at a time), Compression (with a bandage), and Elevation. If you can't put weight on it or the pain is severe, see a doctor.",
  "cut,wound,bleeding":
    "For a minor cut, apply gentle pressure with a clean cloth to stop the bleeding. Clean the wound with water and apply an antiseptic and a bandage. For deep wounds or heavy bleeding, seek medical help immediately.",
  "burn,scald":
    "For a minor burn, run cool (not cold) water over the area for 10-15 minutes. Cover it with a sterile, non-stick bandage. Do not use ice or butter. For severe burns, call for emergency help.",
  "allergy,hives,sneezing":
    "For mild allergies, over-the-counter antihistamines can help. Try to identify and avoid your triggers. For severe reactions, like difficulty breathing, seek emergency medical care.",
  "diabetes,high blood sugar":
    "Diabetes is a serious condition. Management involves monitoring blood sugar, a healthy diet, exercise, and often medication. Please consult a doctor for a proper diagnosis and management plan.",
  "hypertension,high blood pressure,high bp":
    "High blood pressure often has no symptoms. It's important to get it checked regularly. Management includes a low-salt diet, regular exercise, managing stress, and medication if prescribed by your doctor.",
  "insomnia,can't sleep,sleep problem":
    "To improve sleep, try to maintain a regular sleep schedule, create a relaxing bedtime routine, and avoid caffeine or heavy meals late at night. If insomnia persists, speak with a healthcare provider.",
  "anxiety,stress,panic attack,worried":
    "For feelings of anxiety or stress, try deep breathing exercises, mindfulness, or light physical activity. If these feelings are overwhelming or interfere with your daily life, please talk to a mental health professional.",
  "depression,sad,feeling down":
    "It's important to talk to someone if you're feeling persistently sad or down. Please consider reaching out to a friend, family member, or a mental health professional. You are not alone.",
  "acne,pimples,zits":
    "To manage acne, keep your face clean, avoid touching it, and use over-the-counter products with benzoyl peroxide or salicylic acid. If it's severe, a dermatologist can help.",
  "back pain,backache":
    "For mild back pain, try gentle stretching, using a hot or cold compress, and maintaining good posture. Over-the-counter pain relievers may help. If the pain is severe or chronic, see a doctor.",
  "joint pain,arthritis,knee pain":
    "For joint pain, rest the affected joint and apply ice or heat. Gentle exercise and maintaining a healthy weight can help manage conditions like arthritis. A doctor can provide a proper diagnosis.",
  "dizzy,dizziness,lightheaded":
    "If you feel dizzy, sit or lie down immediately. Drink some water. Dizziness can have many causes, from dehydration to more serious issues. If it's frequent or severe, consult a doctor.",
  "fatigue,tired,exhausted,no energy":
    "Persistent fatigue can be a sign of many things, including poor sleep, stress, or an underlying medical condition. Ensure you're getting 7-8 hours of sleep, eating a balanced diet, and exercising. If it doesn't improve, see a doctor.",
  "menstrual cramps,period pain":
    "To ease menstrual cramps, you can try a heating pad on your abdomen, gentle exercise, or over-the-counter pain relievers like ibuprofen. If the pain is debilitating, discuss it with your gynecologist.",
  "pregnancy,pregnant":
    "If you think you might be pregnant, it's best to take a home pregnancy test and confirm with a doctor. Prenatal care is very important for a healthy pregnancy.",
  "vaccine,vaccination,immunization":
    "Vaccines are a safe and effective way to protect against serious diseases. It's important to stay up-to-date with your immunizations as recommended by your healthcare provider.",
  "skin rash,itchy skin":
    "For a mild skin rash, keep the area clean and dry. An over-the-counter hydrocortisone cream or calamine lotion may relieve itching. If the rash spreads, is painful, or you have a fever, see a doctor.",
  "heartburn,acid reflux":
    "To manage heartburn, try avoiding trigger foods (like spicy or fatty foods), eating smaller meals, and not lying down right after eating. Over-the-counter antacids can help. If it happens often, consult a doctor.",
  "eye strain,sore eyes,blurry vision":
    "If your eyes feel strained, try the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds. Ensure good lighting and take regular breaks from screens. If vision is blurry, see an optometrist.",
  "dehydration,thirsty":
    "Signs of dehydration include dark yellow urine, thirst, and dizziness. Drink plenty of water throughout the day. Sports drinks or oral rehydration solutions can help if you've lost a lot of fluids.",

  // --- Category: Common Illnesses ---
  "flu,influenza":
    "Flu symptoms often include fever, body aches, cough, and fatigue. Rest, hydration, and over-the-counter flu medications are key. See a doctor if you have breathing difficulty or symptoms worsen.",
  "strep throat":
    "Strep throat causes a severe sore throat, fever, and swollen lymph nodes. It requires a doctor's diagnosis (a strep test) and is usually treated with antibiotics. See a doctor for a proper diagnosis.",
  "pink eye,conjunctivitis":
    "Pink eye (conjunctivitis) causes red, itchy, and watery eyes, often with discharge. It can be viral, bacterial, or allergic. It's important to see a doctor to determine the cause and get the right treatment, such as antibiotic eye drops.",
  "ear infection,otitis media":
    "Ear infections cause ear pain, fever, and sometimes difficulty hearing. They are common in children. While some resolve on their own, a doctor may prescribe antibiotics. Consult a doctor for pain relief and treatment.",
  bronchitis:
    "Bronchitis is an inflammation of the bronchial tubes, causing a persistent cough (often with mucus), chest tightness, and wheezing. Rest, fluids, and a humidifier can help. See a doctor if your cough is severe or lasts for weeks.",
  pneumonia:
    "Pneumonia is a serious lung infection with symptoms like high fever, chills, a cough with phlegm, and sharp chest pain. You must see a doctor immediately if you suspect pneumonia, as it often requires antibiotics or hospitalization.",
  "sinus infection,sinusitis":
    "Sinusitis causes facial pain, a stuffy or runny nose, and headache. Nasal decongestants, saline rinses, and steam can help. If it lasts over a week or includes a high fever, see a doctor.",
  tonsillitis:
    "Tonsillitis is inflammation of the tonsils, leading to a sore throat, red/swollen tonsils, and fever. Treatment depends on the cause (viral or bacterial). See a doctor for a diagnosis.",
  "mono,mononucleosis":
    "Mononucleosis ('mono') causes extreme fatigue, fever, sore throat, and swollen lymph nodes. It's viral, so treatment involves rest and fluids, sometimes for several weeks. A doctor can confirm the diagnosis.",
  "food poisoning":
    "Food poisoning typically causes vomiting, diarrhea, and stomach cramps within hours of eating contaminated food. The main treatment is rehydration with water and electrolytes. See a doctor if you have a high fever, blood in your stool, or can't keep any liquids down.",
  "gastroenteritis,stomach flu":
    "Gastroenteritis (stomach flu) is a viral infection causing watery diarrhea, cramps, nausea, and vomiting. It's different from influenza. Focus on rehydration with clear fluids. See a doctor if dehydration becomes severe.",
  "chickenpox,varicella":
    "Chickenpox causes an itchy rash of fluid-filled blisters, along with fever and fatigue. Calamine lotion and oatmeal baths can soothe itching. It's highly contagious. A vaccine is available to prevent it.",
  "shingles,herpes zoster":
    "Shingles is a painful rash caused by the same virus as chickenpox. It typically appears as a stripe of blisters on one side of the body. See a doctor immediately for antiviral medication, which can reduce the severity.",
  "ringworm,tinea":
    "Ringworm is a fungal infection of the skin (not a worm) that causes a ring-shaped, itchy rash. Over-the-counter antifungal creams can treat it. Keep the area clean and dry. Consult a doctor if it doesn't improve.",
  "athlete's foot,tinea pedis":
    "Athlete's foot is a fungal infection on the feet, causing itching, scaling, and redness. Keep feet dry, change socks often, and use over-the-counter antifungal powders or creams. See a doctor if it's persistent.",
  "jock itch,tinea cruris":
    "Jock itch is a fungal infection in the groin area, causing an itchy, red rash. Treat it with antifungal creams and by keeping the area clean and dry. Wear loose-fitting cotton underwear.",

  // --- Category: Injuries & First Aid ---
  "broken bone,fracture":
    "If you suspect a broken bone (severe pain, swelling, inability to move the limb), immobilize the area, apply ice, and go to an emergency room or urgent care immediately for an X-ray and treatment.",
  "concussion,head injury":
    "A concussion is a brain injury. Symptoms (headache, dizziness, confusion, nausea) may be delayed. After any head injury, it's crucial to be evaluated by a doctor. Rest is the primary treatment.",
  "dislocated shoulder,dislocation":
    "A dislocation is when a bone is forced out of its socket. It is extremely painful and causes visible deformity. Do not try to pop it back in yourself. Go to the emergency room immediately.",
  "cpr,cardiopulmonary resuscitation":
    "CPR is an emergency procedure. If you see someone collapse, first call for emergency help (like 112 or 911). Then, if you are trained, start chest compressions. If you are not trained, follow the dispatcher's instructions.",
  choking:
    "If someone is choking and cannot cough or talk, perform the Heimlich maneuver (abdominal thrusts). Call for emergency help immediately. For babies, use back blows and chest thrusts.",
  "seizure,convulsion":
    "If someone is having a seizure, ease them to the floor, turn them gently onto one side, and clear the area of hard objects. Do not put anything in their mouth. Call for emergency help if it's their first seizure or lasts over 5 minutes.",
  shock:
    "Shock is a life-threatening condition caused by low blood flow. Symptoms include cold/clammy skin, rapid pulse, and confusion. Call emergency services immediately. Have the person lie down with feet elevated.",
  "nosebleed,epistaxis":
    "For a nosebleed, sit and lean forward. Pinch your nostrils shut for 10-15 minutes. Do not lean back. If bleeding is heavy or doesn't stop after 20 minutes, seek medical attention.",
  "insect sting,bee sting":
    "For a bee sting, remove the stinger by scraping it. Wash the area and apply a cold compress. Over-the-counter antihistamines can help itching. Seek emergency care for signs of an allergic reaction (difficulty breathing, swelling of the face or throat).",
  "snake bite":
    "A snake bite is a medical emergency. Call for help immediately. Keep the person calm and still, and position the bite below the level of the heart. Do not apply a tourniquet or try to suck out the venom.",
  "jellyfish sting":
    "For a jellyfish sting, rinse the area with vinegar (if available) or seawater. Do not use fresh water. Carefully remove any tentacles. Hot water immersion can help with pain. Seek medical help for severe reactions.",
  frostbite:
    "Frostbite causes numbness and discolored skin (white, gray, or blue). Move to a warm place. Gradually rewarm the affected area with warm (not hot) water. Do not rub. Seek medical attention immediately.",
  "heat stroke,sunstroke":
    "Heatstroke is a medical emergency. Symptoms include high fever (over 103°F), hot/red skin, and confusion. Call emergency services immediately. Move the person to a cool place and apply cool, wet cloths.",
  "heat exhaustion":
    "Heat exhaustion symptoms include heavy sweating, weakness, dizziness, and nausea. Move to a cool place, sip water, and loosen clothing. If symptoms don't improve or you show signs of heatstroke, get help.",
  hypothermia:
    "Hypothermia is a dangerously low body temperature. Symptoms include shivering, confusion, and slurred speech. Call emergency services. Move the person to a warm, dry place and cover them with blankets.",

  // --- Category: Skin Conditions ---
  "eczema,atopic dermatitis":
    "Eczema causes dry, itchy, and inflamed skin. Keep skin moisturized with unscented emollients, avoid triggers (like certain soaps), and a doctor can prescribe steroid creams for flare-ups.",
  psoriasis:
    "Psoriasis is an autoimmune condition causing thick, scaly, red patches on the skin. While there is no cure, a dermatologist can provide treatments like topical creams, light therapy, or medications to manage it.",
  rosacea:
    "Rosacea causes facial redness, flushing, and sometimes bumps. Identifying and avoiding triggers (like spicy food, alcohol, sun) is key. A dermatologist can prescribe gels or medications to manage redness.",
  "hives,urticaria":
    "Hives are raised, itchy welts on the skin, often from an allergic reaction. Over-the-counter antihistamines can help. Seek emergency care if you have hives with swelling of the face or difficulty breathing.",
  warts:
    "Warts are skin growths caused by a virus. They are usually harmless. Over-the-counter treatments (salicylic acid) can work, or a dermatologist can remove them by freezing or other methods.",
  "fungal nail infection,onychomycosis":
    "A fungal nail infection causes nails to become thick, yellow, and brittle. It's hard to treat. A doctor can prescribe oral antifungal medications or medicated nail polishes.",
  impetigo:
    "Impetigo is a contagious bacterial skin infection, common in children, causing red sores or blisters. It requires a doctor's diagnosis and is treated with antibiotic creams or pills.",
  scabies:
    "Scabies is caused by tiny mites that burrow into the skin, causing an intensely itchy rash. It is very contagious. A doctor must diagnose it and will prescribe a medicated cream to kill the mites.",
  sunburn:
    "For sunburn, cool the skin with a damp cloth, apply aloe vera gel, and drink plenty of water. Over-the-counter pain relievers can help. Avoid further sun exposure. See a doctor for severe, blistering sunburn.",
  blister:
    "For a friction blister, try not to pop it. Clean it and cover it with a bandage. If it pops, wash it, apply antiseptic, and cover it. See a doctor for signs of infection (pus, redness).",
  "dandruff,seborrheic dermatitis":
    "Dandruff causes a flaky, itchy scalp. Use an over-the-counter medicated shampoo (with ingredients like ketoconazole, selenium sulfide, or zinc). See a dermatologist if it's severe.",
  "hair loss,alopecia":
    "Hair loss can have many causes (genetics, stress, medical conditions). A dermatologist can help determine the cause and discuss treatment options, which may include medications or lifestyle changes.",
  cellulitis:
    "Cellulitis is a serious bacterial skin infection causing a red, swollen, warm, and painful area of skin. You must see a doctor immediately. It is treated with antibiotics.",
  "boil,furuncle":
    "A boil is a painful, pus-filled bump under the skin. Apply a warm compress to help it drain. Do not squeeze it. See a doctor if it's large, very painful, or you develop a fever.",
  "moles,check mole":
    "Most moles are harmless. However, check your skin regularly. See a dermatologist if you notice a mole that is Asymmetrical, has an irregular Border, changes Color, has a large Diameter, or is Evolving (ABCDE).",

  // --- Category: Digestive & Urinary ---
  "ibs,irritable bowel syndrome":
    "IBS is a common disorder causing cramping, bloating, gas, diarrhea, and constipation. A doctor can help diagnose it and suggest management through diet (like a low-FODMAP diet), stress reduction, and medication.",
  "gerd,gastroesophageal reflux disease":
    "GERD is chronic acid reflux. Management involves avoiding trigger foods, not eating before bed, and over-the-counter antacids. A doctor can prescribe stronger medications if needed.",
  "ulcer,peptic ulcer":
    "A peptic ulcer is a sore in the lining of the stomach or intestine. Symptoms include burning stomach pain. It's often caused by H. pylori bacteria or NSAID use. See a doctor for diagnosis and treatment.",
  "crohn's disease":
    "Crohn's disease is an inflammatory bowel disease (IBD) causing severe diarrhea, abdominal pain, and weight loss. It requires long-term management by a gastroenterologist.",
  "ulcerative colitis":
    "Ulcerative colitis is an IBD that causes inflammation and ulcers in the large intestine. Symptoms include bloody diarrhea and abdominal pain. This is a serious condition that must be managed by a doctor.",
  gallstones:
    "Gallstones can cause severe pain in the upper right abdomen, especially after a fatty meal. If you have sudden, intense abdominal pain, seek medical evaluation. Treatment may involve surgery.",
  "hemorrhoids,piles":
    "Hhemorrhoids are swollen veins in the rectum, causing itching, pain, and sometimes bleeding. Over-the-counter creams, sitz baths, and a high-fiber diet can help. See a doctor if there is significant bleeding.",
  "uti,urinary tract infection":
    "A UTI causes a burning feeling during urination, frequent urination, and cloudy urine. It's important to see a doctor for a diagnosis and antibiotics. Drink plenty of water.",
  "kidney stones":
    "Kidney stones cause excruciating, sharp pain in the back or side, often with nausea. Drink lots of water. See a doctor immediately. Some stones pass on their own, but others require medical procedures.",
  appendicitis:
    "Appendicitis causes sudden, sharp pain that starts near the navel and moves to the lower right abdomen. It's a medical emergency that requires surgery. Go to the ER if you have these symptoms.",

  // --- Category: Musculoskeletal ---
  sciatica:
    "Sciatica is pain that radiates along the path of the sciatic nerve (from the lower back down the leg). Gentle stretching and heat/ice can help. See a doctor or physical therapist if it's severe or persistent.",
  "carpal tunnel syndrome":
    "Carpal tunnel causes numbness, tingling, and pain in the hand and wrist. A wrist splint, ergonomic adjustments, and stretches can help. A doctor can confirm the diagnosis.",
  "plantar fasciitis":
    "Plantar fasciitis causes stabbing pain in the heel, especially in the morning. Stretching, supportive shoes, and ice can help. A podiatrist or physical therapist can provide further treatment.",
  tendinitis:
    "Tendinitis is inflammation of a tendon, causing pain and tenderness near a joint (e.g., tennis elbow, Achilles tendinitis). Rest and ice are key. Physical therapy can help strengthen the area.",
  bursitis:
    "Bursitis is inflammation of the bursa sacs that cushion joints, often in the shoulder, hip, or elbow. It causes a dull, achy pain. Rest the joint and use ice. See a doctor if pain is severe.",
  gout: "Gout is a type of arthritis causing sudden, severe attacks of pain, redness, and swelling, often in the big toe. It's caused by uric acid crystals. See a doctor for diagnosis and medication.",
  "rheumatoid arthritis,ra":
    "Rheumatoid arthritis is an autoimmune disease causing painful, swollen, and stiff joints. It's different from osteoarthritis. It requires management by a rheumatologist.",
  "osteoarthritis,oa":
    "Osteoarthritis is the 'wear and tear' arthritis that causes joint pain and stiffness, often in the knees, hips, or hands. Management includes exercise, maintaining a healthy weight, and pain relief.",
  osteoporosis:
    "Osteoporosis is a condition where bones become weak and brittle. It's often 'silent' until a fracture occurs. A doctor can order a bone density scan. Weight-bearing exercise and calcium/Vitamin D are important.",
  fibromyalgia:
    "Fibromyalgia is a chronic condition causing widespread pain, fatigue, and 'brain fog'. There is no cure, but a doctor can help manage symptoms through medication, exercise, and stress management.",

  // --- Category: Women's Health ---
  "yeast infection,candida":
    "A yeast infection causes itching, burning, and a thick white discharge. Over-the-counter antifungal creams can treat it, but it's good to see a doctor for a first-time diagnosis to be sure.",
  "bacterial vaginosis,bv":
    "BV is a common infection caused by an imbalance of bacteria, often causing a fishy odor and thin discharge. It's important to see a doctor as it requires a prescription antibiotic.",
  "pcos,polycystic ovary syndrome":
    "PCOS is a hormonal disorder that can cause irregular periods, acne, and other symptoms. If you have irregular cycles, it's important to see a gynecologist for evaluation and management.",
  endometriosis:
    "Endometriosis is a condition where uterine-like tissue grows outside the uterus, causing very painful periods and pelvic pain. This requires a diagnosis and management plan from a gynecologist.",
  menopause:
    "Menopause is the natural end of menstruation, usually in the 40s or 50s. Symptoms like hot flashes and night sweats are common. A doctor can discuss symptom management, including hormone therapy.",
  "pms,premenstrual syndrome":
    "PMS causes symptoms like bloating, mood swings, and cramps before a period. Regular exercise, a healthy diet, and stress management can help. See a doctor if symptoms are severe.",
  "breast lump,check breast":
    "It's important to be aware of how your breasts normally feel. If you find a new lump, or notice any skin dimpling, nipple discharge, or persistent pain, see a doctor promptly for an evaluation.",

  // --- Category: Men's Health ---
  "prostate,bph,enlarged prostate":
    "An enlarged prostate (BPH) is common in older men and can cause urinary problems (frequent urination, weak stream). A doctor (urologist) can diagnose and manage this condition.",
  prostatitis:
    "Prostatitis is inflammation of the prostate, which can cause painful urination and pelvic pain. It's important to see a doctor as it's often caused by a bacterial infection requiring antibiotics.",
  "testicular pain,check testicle":
    "Sudden, severe testicular pain is a medical emergency (could be torsion) and you must go to the ER. For any lump, swelling, or dull ache, see a doctor promptly to get it checked.",
  "ed,erectile dysfunction":
    "Erectile dysfunction is the inability to get or keep an erection. It has many possible causes (physical or psychological). It's important to talk to a doctor, as it can be a sign of other health issues.",

  // --- Category: Children's Health ---
  teething:
    "Teething can cause fussiness, drooling, and a desire to chew. A chilled (not frozen) teething ring or gently rubbing the gums can help. Avoid teething gels with benzocaine. A mild fever can occur, but a high fever is not from teething.",
  colic:
    "Colic is defined as crying for more than 3 hours a day, 3 days a week, for at least 3 weeks in an otherwise healthy baby. It's very stressful but usually resolves on its own. Speak to your pediatrician for advice and support.",
  "diaper rash":
    "Diaper rash is a red, inflamed rash in the diaper area. Keep the area clean and dry, change diapers frequently, and use a zinc oxide barrier cream. See a doctor if it's severe or has blisters.",
  croup:
    "Croup is a viral infection in young children causing a 'barking' cough and noisy breathing. Sitting in a steamy bathroom can help. See a doctor, or seek emergency care if the child is struggling to breathe.",
  "hand foot and mouth disease,hfm":
    "HFM is a viral illness causing sores in the mouth and a rash on the hands and feet. It's common in children. Treatment involves pain relief (like acetaminophen) and fluids. It's very contagious.",
  measles:
    "Measles is a highly contagious virus causing high fever, cough, and a distinctive red rash. It can be very serious. The MMR vaccine provides excellent protection. See a doctor immediately if you suspect measles.",
  mumps:
    "Mumps is a virus causing fever, headache, and painfully swollen salivary glands (puffy cheeks). The MMR vaccine prevents it. Consult a doctor for diagnosis and care.",
  "rubella,german measles":
    "Rubella is a viral infection causing a mild fever and rash. It's most dangerous for pregnant women. The MMR vaccine prevents it.",
  "whooping cough,pertussis":
    "Whooping cough is a bacterial infection causing severe, uncontrollable coughing fits that end in a 'whooping' sound. It's very dangerous for babies. Vaccination is key. See a doctor immediately.",

  // --- Category: Mental Health ---
  "ptsd,post traumatic stress":
    "PTSD can develop after a traumatic event, causing flashbacks, nightmares, and severe anxiety. It is a treatable condition. Please seek help from a mental health professional.",
  "ocd,obsessive compulsive disorder":
    "OCD involves unwanted, repetitive thoughts (obsessions) and behaviors (compulsions). It's a medical condition, not a personality quirk. Therapy, especially CBT, and medication can be very effective.",
  "bipolar disorder":
    "Bipolar disorder causes extreme mood swings between highs (mania) and lows (depression). It is a serious, long-term condition that requires management with a psychiatrist.",
  schizophrenia:
    "Schizophrenia is a complex mental illness that affects how a person thinks, feels, and behaves. Symptoms can include delusions and hallucinations. It requires professional medical treatment.",
  "eating disorder,anorexia,bulimia":
    "Eating disorders are serious, life-threatening mental illnesses. If you or someone you know is struggling with their relationship with food and body image, please seek professional help from a doctor or therapist specializing in eating disorders.",
  "add,adhd,attention deficit":
    "ADHD is a neurodevelopmental disorder that can cause inattention, hyperactivity, and impulsivity. It's not just a childhood disorder. A professional evaluation can lead to a proper diagnosis and management plan.",
  "autism,asd":
    "Autism Spectrum Disorder (ASD) is a developmental condition that affects communication and behavior. It's a spectrum, and every individual is different. Support and resources are available; a doctor can provide a referral for evaluation.",

  // --- Category: Chronic & Autoimmune ---
  lupus:
    "Lupus is a chronic autoimmune disease that can cause inflammation and pain in any part of the body. Symptoms often include fatigue, joint pain, and a 'butterfly' rash on the face. It must be managed by a rheumatologist.",
  "ms,multiple sclerosis":
    "Multiple Sclerosis is an autoimmune disease that affects the central nervous system. Symptoms can include numbness, weakness, vision problems, and fatigue. It requires diagnosis and long-term care from a neurologist.",
  "thyroid,hypothyroidism,hyperthyroidism":
    "The thyroid gland controls metabolism. Hypothyroidism (underactive) can cause fatigue and weight gain. Hyperthyroidism (overactive) can cause weight loss and anxiety. A doctor can diagnose this with a simple blood test.",
  "anemia,iron deficiency":
    "Anemia is a lack of red blood cells, often causing fatigue, weakness, and pale skin. It can be caused by iron deficiency. A doctor can confirm this with a blood test and recommend supplements or dietary changes.",
  "celiac disease":
    "Celiac disease is an autoimmune disorder where eating gluten (a protein in wheat) damages the small intestine. Symptoms include digestive issues and fatigue. Diagnosis requires a doctor, and treatment is a strict gluten-free diet.",
  "type 1 diabetes":
    "Type 1 diabetes is an autoimmune condition where the body does not produce insulin. It is different from Type 2 and requires lifelong insulin therapy. It must be managed with a doctor (endocrinologist).",
  "hiv,aids":
    "HIV is a virus that attacks the immune system. With modern antiretroviral therapy (ART), people with HIV can live long, healthy lives. AIDS is the late stage of HIV infection. It's crucial to get tested and, if positive, start treatment.",

  // --- Category: Sensory ---
  "tinnitus,ringing in ears":
    "Tinnitus is a ringing, buzzing, or hissing sound in the ears. It can be caused by noise exposure or underlying conditions. An audiologist or ENT (ear, nose, throat) doctor can evaluate it.",
  vertigo:
    "Vertigo is a sensation of spinning or dizziness. It's often caused by an inner ear problem. A doctor can help determine the cause and may prescribe medication or specific exercises (like the Epley maneuver).",
  glaucoma:
    "Glaucoma is an eye condition that damages the optic nerve, often due to high pressure in the eye. It usually has no early symptoms. Regular eye exams are crucial to catch it early and prevent vision loss.",
  cataracts:
    "Cataracts are a clouding of the eye's natural lens, causing blurry or dim vision. It's very common with aging. An ophthalmologist can diagnose it, and it can be corrected with a common surgery.",
  "macular degeneration,amd":
    "AMD is an eye disease that causes progressive loss of central vision, making it hard to read or see faces. Regular eye exams are key. A doctor can discuss management options.",
  "dry eyes":
    "Dry eyes can cause a gritty, stinging, or burning sensation. Over-the-counter lubricating eye drops (artificial tears) can help. Avoid fans blowing on your face and take breaks from screens.",
  stye: "A stye is a red, painful lump near the edge of the eyelid. Apply a warm, wet compress for 10-15 minutes, several times a day. Do not squeeze it. See a doctor if it doesn't improve.",
  "earwax blockage,cerumen":
    "Earwax blockage can cause muffled hearing. Do not use cotton swabs. Over-the-counter earwax softening drops can help. A doctor can safely remove a large blockage.",

  // --- Category: Respiratory & Cardiovascular ---
  asthma:
    "Asthma is a chronic condition that narrows the airways, causing wheezing, coughing, and shortness of breath. It's managed with inhalers (a 'reliever' for attacks and a 'preventer' for control). A doctor must diagnose and manage this.",
  "copd,chronic obstructive pulmonary disease":
    "COPD is a chronic lung disease (like emphysema or chronic bronchitis) that makes it hard to breathe, usually caused by smoking. It requires medical management. Quitting smoking is the most important step.",
  "heart attack,myocardial infarction":
    "A heart attack is a medical emergency. Symptoms include chest pain (pressure, tightness), pain in the arm/jaw, shortness of breath, and nausea. Call for emergency help immediately.",
  stroke:
    "A stroke is a medical emergency. Use the F.A.S.T. acronym: Face drooping, Arm weakness, Speech difficulty, Time to call for help. Call emergency services immediately.",
  "cholesterol,high cholesterol":
    "High cholesterol increases the risk of heart disease. It has no symptoms. A doctor can check it with a blood test. It's managed with diet, exercise, and sometimes medication.",
  "dvt,deep vein thrombosis":
    "DVT is a blood clot in a deep vein, usually in the leg, causing pain and swelling. It's serious because the clot can travel to the lungs. See a doctor immediately if you suspect a DVT.",
  "varicose veins":
    "Varicose veins are swollen, twisted veins, usually in the legs. They can be a cosmetic concern or cause aching pain. Compression stockings, exercise, and elevating the legs can help.",
  "arrhythmia,palpitations,irregular heartbeat":
    "Palpitations (a feeling of a fluttering or racing heart) can be harmless, but they can also be a sign of an arrhythmia (irregular heartbeat). See a doctor to get an evaluation, especially if you also feel dizzy or short of breath.",

  // --- Category: Procedures & General Health ---
  "blood test,blood work":
    "A blood test is a common diagnostic tool. A doctor orders it to check for various conditions, like infection, anemia, or organ function. It's usually a very safe and quick procedure.",
  "mri,magnetic resonance imaging":
    "An MRI uses a large magnet and radio waves to create detailed images of organs and tissues. It's painless but can be loud. It's used to diagnose many conditions, from joint injuries to brain tumors.",
  "ct scan,cat scan":
    "A CT scan (Computed Tomography) uses X-rays from different angles to create cross-sectional images (slices) of the body. It's faster than an MRI and good for viewing bones, blood vessels, and soft tissues.",
  "x-ray":
    "An X-ray is a quick, painless test that uses radiation to create images of the inside of your body, primarily your bones. It's used to diagnose fractures, pneumonia, and other issues.",
  "ultrasound,sonogram":
    "An ultrasound uses high-frequency sound waves to create live images of the inside of the body. It's commonly used during pregnancy and to look at organs like the heart, liver, and kidneys. It is very safe.",
  biopsy:
    "A biopsy is a medical procedure where a small sample of tissue is removed from the body to be examined under a microscope. It's the most reliable way to diagnose many conditions, including cancer.",
  antibiotics:
    "Antibiotics are powerful medicines that fight bacterial infections. They do not work on viruses (like the cold or flu). It's crucial to take the full course as prescribed by your doctor.",
  "painkillers,pain relievers":
    "Over-the-counter pain relievers include acetaminophen and NSAIDs (like ibuprofen). They are effective but have risks. Follow the dosage instructions and ask a doctor or pharmacist if you're unsure.",
  probiotics:
    "Probiotics are 'good' bacteria, often found in yogurt and fermented foods, that may help with digestive health. They are generally safe, but their benefits can vary. Consult a doctor for specific health issues.",
  "vitamins,supplements":
    "Most people get all the vitamins they need from a balanced diet. A doctor can test for deficiencies (like Vitamin D or B12) and recommend supplements if you are deficient.",
  "diet,healthy eating":
    "A healthy diet generally includes plenty of fruits, vegetables, whole grains, and lean protein. Try to limit processed foods, sugar, and saturated fats. For specific dietary plans, consult a doctor or registered dietitian.",
  "exercise,physical activity":
    "Regular exercise (like 30 minutes of walking most days) has enormous health benefits for your heart, muscles, bones, and mental health. Start slowly and choose activities you enjoy.",
  "hydration,drink water":
    "Staying hydrated is crucial for energy levels, brain function, and overall health. Aim to drink water throughout the day. Your urine should be a pale yellow color.",
  "smoking,quit smoking":
    "Smoking is extremely harmful to nearly every organ in the body. Quitting is the single best thing you can do for your health. There are many resources to help, including patches, gum, and counseling. Ask your doctor for help.",
  alcohol:
    "Moderate alcohol consumption may be okay for some, but excessive drinking is very harmful to the liver, heart, and brain. It's important to be honest with your doctor about your alcohol use.",
};

function getAIResponse(message) {
  const lowerMsg = message.toLowerCase();

  // Iterate through the knowledge base
  for (const key in knowledgeBase) {
    const keywords = key.split(","); // Split the comma-separated keywords into an array

    // Check if any keyword in the array is present in the user's message
    const found = keywords.some((keyword) => lowerMsg.includes(keyword.trim()));

    if (found) {
      return knowledgeBase[key]; // Return the corresponding response
    }
  }

  // Default response if no keyword is matched
  return "I understand you're asking about health concerns. For accurate medical advice, please consult with a healthcare professional. I can provide general health information and guide you to resources.";
}

// ===== END: CHATBOT KNOWLEDGE BASE =====

/* ===== SPEECH & TTS (from chat.js) ===== */
function initializeSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      isRecording = true;
      document.getElementById("micBtn")?.classList.add("recording");
    };

    recognition.onend = () => {
      isRecording = false;
      document.getElementById("micBtn")?.classList.remove("recording");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById("chatInput").value = transcript;
      setTimeout(() => sendMessage(), 100);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      isRecording = false;
      document.getElementById("micBtn")?.classList.remove("recording");
      if (event.error === "not-allowed") {
        showToast(
          "Microphone access denied. Please allow microphone access.",
          "error"
        );
      }
    };
  } else {
    warn("Speech recognition not supported in this browser.");
  }
}

function toggleRecording() {
  if (!recognition) {
    showToast("Speech recognition not supported in this browser.", "error");
    return;
  }

  if (isRecording) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (e) {
      showToast("Microphone not available.", "error");
    }
  }
}

function speakText(text) {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }
}

/* ===== ACCORDION (from chat.js) ===== */
function initializeAccordion() {
  const accordionHeaders = document.querySelectorAll(".accordion-header");

  accordionHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const item = header.parentElement;
      if (!item) return;
      const wasActive = item.classList.contains("active");

      // Close all items
      document.querySelectorAll(".accordion-item").forEach((i) => {
        i.classList.remove("active");
      });

      // Open clicked item if it wasn't active
      if (!wasActive) {
        item.classList.add("active");
      }
    });
  });
}

/* ===== CONTACT FORM (from chat.js) ===== */
function initializeContactForm() {
  const contactForm = document.querySelector(".contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast(
        "Message sent successfully! We will get back to you soon.",
        "success"
      );
      e.target.reset();
    });
  }
}

/* ===== UTILITY (from chat.js) ===== */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ===== API & DATA FETCHING (from script.js) ===== */

/** Builds a URL for the Google Apps Script endpoint. */
function buildAppsScriptUrl(params) {
  if (
    !APPS_SCRIPT_EXEC_URL ||
    APPS_SCRIPT_EXEC_URL.indexOf("script.google.com") === -1
  ) {
    warn(
      "APPS_SCRIPT_EXEC_URL not set or invalid. Set it at top of script.js if using USE_APPS_SCRIPT."
    );
  }
  const u = new URL(APPS_SCRIPT_EXEC_URL);
  Object.keys(params || {}).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null)
      u.searchParams.set(k, params[k]);
  });
  if (API_KEY) u.searchParams.set("key", API_KEY);
  return u.toString();
}

async function getAllHospitalsForState(state) {
  if (!state) return [];
  if (USE_APPS_SCRIPT) {
    const url = buildAppsScriptUrl({ sheet: "Hospitals", state });
    const data = await safeFetchJson(url);
    if (!data) return [];
    // derive unique hospital names regardless of district
    const set = new Set();
    data.forEach((r) => {
      const name = (
        r.Name ||
        r.name ||
        r["Hospital Name"] ||
        r["Name (Hospital Name)"] ||
        ""
      )
        .toString()
        .trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  } else {
    const url = `${BASE_API}/api/hospitals?state=${encodeURIComponent(state)}`;
    return (await safeFetchJson(url)) || [];
  }
}

async function getDistrictsForState(state) {
  if (!state) return [];
  if (USE_APPS_SCRIPT) {
    const url = buildAppsScriptUrl({ sheet: "Hospitals", state });
    const data = await safeFetchJson(url);
    if (!data) return [];
    const set = new Set();
    data.forEach((r) => {
      const d = (r.District || r.district || "").toString().trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  } else {
    const url = `${BASE_API}/api/districts?state=${encodeURIComponent(state)}`;
    return (await safeFetchJson(url)) || [];
  }
}

async function getStatesList() {
  // derive states from Hospitals sheet
  if (USE_APPS_SCRIPT) {
    const url = buildAppsScriptUrl({ sheet: "Hospitals" });
    const data = await safeFetchJson(url);
    if (!data) return [];
    const set = new Set();
    data.forEach((r) => {
      const s = (r.State || r.state || "").toString().trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  } else {
    return (await safeFetchJson(`${BASE_API}/api/states`)) || [];
  }
}

async function getHospitalsForStateAndDistrict(state, district) {
  if (!state || !district) return [];
  if (USE_APPS_SCRIPT) {
    const url = buildAppsScriptUrl({ sheet: "Hospitals", state });
    const data = await safeFetchJson(url);
    if (!data) return [];
    const want = district.toString().trim().toLowerCase();
    const names = new Set();
    data.forEach((r) => {
      const d = (r.District || r.district || "").toString().trim().toLowerCase();
      if (d === want) {
        const name = (
          r.Name ||
          r.name ||
          r["Hospital Name"] ||
          ""
        ).toString().trim();
        if (name) names.add(name);
      }
    });
    return Array.from(names).sort();
  } else {
    const url = `${BASE_API}/api/hospitals?state=${encodeURIComponent(
      state
    )}&district=${encodeURIComponent(district)}`;
    return (await safeFetchJson(url)) || [];
  }
}

async function getSchemeStates() {
  if (USE_APPS_SCRIPT) {
    const url = buildAppsScriptUrl({ sheet: "Schemes" });
    const data = await safeFetchJson(url);
    if (!data) return [];
    const set = new Set();
    data.forEach((r) => {
      const s =
        (r["Target Audience"] || r.state || r.State || "").toString().trim() ||
        "All India";
      set.add(s);
    });
    const res = Array.from(set).sort();
    if (res.includes("All India")) {
      res.splice(res.indexOf("All India"), 1);
      res.unshift("All India");
    }
    return res;
  } else {
    return (await safeFetchJson(`${BASE_API}/api/scheme-states`)) || [];
  }
}

async function getSchemes(state) {
  if (USE_APPS_SCRIPT) {
    const url = buildAppsScriptUrl({ sheet: "Schemes" });
    const data = await safeFetchJson(url);
    if (!data) return [];
    if (!state || state.toLowerCase() === "all india") return data;
    const want = state.toString().trim().toLowerCase();
    return data.filter((r) => {
      const s =
        (r["Target Audience"] || r.state || r.State || "").toString().trim().toLowerCase();
      return s === want || s === "all india";
    });
  } else {
    const url = `${BASE_API}/api/schemes?state=${encodeURIComponent(
      state || ""
    )}`;
    return (await safeFetchJson(url)) || [];
  }
}

async function searchFaqs(query) {
  if (!query) return [];
  if (USE_APPS_SCRIPT) {
    const url = buildAppsScriptUrl({ sheet: "Medical_FAQ", query });
    return (await safeFetchJson(url)) || [];
  } else {
    const url = `${BASE_API}/api/faqs?query=${encodeURIComponent(query)}`;
    return (await safeFetchJson(url)) || [];
  }
}

/* ===== BOOKING, PDF & LOCALSTORAGE (from script.js) ===== */

/**
 * Renders the list of bookings from localStorage
 */
function renderBookingsList() {
  const bookingsList = document.getElementById("bookingsList");
  if (!bookingsList) return;
  const bookings = JSON.parse(localStorage.getItem("cm_bookings_v1")) || [];

  if (!bookings.length) {
    bookingsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar"></i>
                <h3>No Appointments Found</h3>
                <p>You haven't booked any appointments yet.</p>
            </div>
        `;
    return;
  }

  bookingsList.innerHTML = bookings
    .map((booking, index) => {
      const appointmentDate = new Date(booking.date);
      const isUpcoming = appointmentDate >= new Date();

      return `
    <div class="booking-card">
      <div class="booking-header">
        <div>
          <h3 class="booking-id">Booking ID: ${
            booking.reference || booking.id
          }</h3>
          <p style="color: var(--text-light); font-size: 0.875rem;">
            ${booking.name} • ${booking.phone}
          </p>
        </div>
        <span class="badge ${isUpcoming ? "badge-upcoming" : "badge-past"}">
            ${isUpcoming ? "Upcoming" : "Past"}
        </span>
      </div>
      <div class="booking-details">
          <div class="booking-detail">
              <i class="fas fa-hospital"></i>
              <div class="booking-detail-content">
                  <p>Hospital & Department</p>
                  <p><strong>${booking.hospital}</strong></p>
                  <p style="color: var(--text-light);">${booking.department}</p>
              </div>
          </div>
          <div class="booking-detail">
              <i class="fas fa-calendar"></i>
              <div class="booking-detail-content">
                  <p>Appointment Date</p>
                  <p><strong>${booking.date}</strong></p>
              </div>
          </div>
          <div class="booking-detail">
              <i class="fas fa-clock"></i>
              <div class="booking-detail-content">
                  <p>Time Slot</p>
                  <p><strong>${booking.timeslot}</strong></p>
              </div>
          </div>
      </div>
      <div class="booking-actions">
        <button class="btn btn-download" data-index="${index}">
            <i class="fas fa-download"></i> Download / Print
        </button>
      </div>
    </div>
  `;
    })
    .join("");

  // Add event listeners to new buttons
  document.querySelectorAll(".btn-download").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = e.currentTarget.getAttribute("data-index");
      const booking = bookings[index];
      if (booking) {
        downloadBookingPDF(booking);
      }
    });
  });
}

/**
 * Generates and downloads/prints a PDF for a booking.
 */
function downloadBookingPDF(booking) {
  const pdfContent = document.getElementById("appointmentPdfTemplate");
  if (!pdfContent) {
    showToast("PDF template not found.", "error");
    return;
  }

  // Check for required libraries
  if (typeof html2canvas === "undefined" || typeof window.jspdf === "undefined") {
    showToast("PDF generation libraries not loaded.", "error");
    err("html2canvas or jspdf is not loaded.");
    return;
  }

  // Fill data
  $id("pdfRefId").textContent = booking.reference || "N/A";
  $id("pdfName").textContent = booking.name || "N/A";
  $id("pdfPhone").textContent = booking.phone || "N/A";
  $id("pdfDob").textContent = booking.dob || "N/A";
  $id("pdfHospital").textContent = booking.hospital || "N/A";
  $id("pdfDept").textContent = booking.department || "N/A";
  $id("pdfDate").textContent = booking.date || "N/A";
  $id("pdfSlot").textContent = booking.timeslot || "N/A";

  // Temporarily show the template
  pdfContent.style.display = "block";

  html2canvas(pdfContent, { scale: 2, useCORS: true })
    .then((canvas) => {
      // Save as PDF
      const imgData = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Appointment_${booking.reference || booking.name}.pdf`);
      showToast("PDF Downloaded!", "success");

      // Also open a printable preview
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const w = window.open("");
        if (w) {
          w.document.write(
            `<html><head><title>Print - ${
              booking.reference || booking.name
            }</title></head><body style="margin:0; padding:0;"><img src="${dataUrl}" style="width:100%; height:auto;" onload="window.focus(); window.print();"></body></html>`
          );
        } else {
          warn(
            "Popup blocked: can't open print preview. User can still download PDF."
          );
        }
      } catch (e) {
        warn("Print preview failed:", e);
      }

      // Hide template again
      pdfContent.style.display = "none";
    })
    .catch((err) => {
      console.error("Error generating PDF image:", err);
      pdfContent.style.display = "none";
      showToast("Failed to generate PDF. See console for details.", "error");
    });
}

/**
 * Handles the appointment form submission.
 */
async function handleAppointmentSubmit(ev) {
  ev && ev.preventDefault && ev.preventDefault();
  const name = ($id("name") && $id("name").value) || "";
  const phone = ($id("phone") && $id("phone").value) || "";
  const dob = ($id("dob") && $id("dob").value) || "";
  const state = ($id("state") && $id("state").value) || "";
  const district = ($id("district") && $id("district").value) || "";
  const hospital = ($id("hospital") && $id("hospital").value) || "";
  const department = ($id("department") && $id("department").value) || "";
  const date = ($id("appointmentDate") && $id("appointmentDate").value) || "";
  const slot = ($id("slot") && $id("slot").value) || "";
  const genderRadio = document.querySelector('input[name="gender"]:checked');
  const gender = genderRadio ? genderRadio.value : "";
  const appTypeRadio = document.querySelector(
    'input[name="appointmentType"]:checked'
  );
  const appointmentType = appTypeRadio ? appTypeRadio.value : "";

  // Validation
  if (!name) {
    showToast("Please enter your full name", "error");
    return;
  }
  if (!validPhone(phone)) {
    showToast("Enter valid 10-digit phone", "error");
    return;
  }
  if (!phoneVerified) {
    showToast("Please verify your phone number first", "error");
    return;
  }
  if (!state || !district || !hospital) {
    showToast("Pick state, district and hospital", "error");
    return;
  }
  if (!slot || !date) {
    showToast("Choose slot & date", "error");
    return;
  }

  // Make a readable reference id for user
  const refShort = Date.now().toString().slice(-6); // last 6 digits of timestamp
  const reference = `CM-${refShort}`;

  const booking = {
    id: `bk_${Date.now()}`, // internal id
    reference, // user-visible booking ref
    name,
    phone,
    dob,
    gender,
    appointmentType,
    state,
    district,
    hospital,
    department,
    date, // appointment date - used by PDF
    timeslot: slot, // timeslot field expected by renderer/PDF
    createdAt: new Date().toISOString(),
  };

  const arr = JSON.parse(localStorage.getItem("cm_bookings_v1") || "[]");
  arr.push(booking);
  localStorage.setItem("cm_bookings_v1", JSON.stringify(arr));
  showToast("Appointment booked successfully!", "success");

  ($id("appointmentForm") && $id("appointmentForm").reset());
  
  // Reset form state
  phoneVerified = false;
  $id("phone").disabled = false;
  $id("verifiedBadge").style.display = "none";
  $id("bookBtn").disabled = true;
  $id("sendOtpBtn").textContent = "Send OTP";
  $id("sendOtpBtn").disabled = false;

  renderBookingsList();

  // optional: server POST if you use proxy
  if (!USE_APPS_SCRIPT) {
    fetch(`${BASE_API}/api/book_appointment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking),
    })
      .then((r) => {
        if (!r.ok) warn("Server booking failed", r.status);
        else log("Booking also sent to server");
      })
      .catch((e) => warn("POST booking failed", e));
  }
}

/* ===== UI WIRING (from script.js) ===== */

function validPhone(ph) {
  return /^[0-9]{10}$/.test((ph || "") + "");
}

/**
 * Wires up the OTP verification simulation logic.
 */
function wireOtpVerification() {
  const sendBtn = $id("sendOtpBtn");
  const verifyBtn = $id("verifyOtpBtn");
  const otpSection = $id("otpSection");
  const verifiedBadge = $id("verifiedBadge");
  const otpInput = $id("otp");
  const phoneInput = $id("phone");
  const bookBtn = $id("bookBtn");

  if (!sendBtn || !verifyBtn || !otpSection || !phoneInput || !bookBtn) {
    warn("OTP elements not found, skipping OTP wiring.");
    return;
  }

  // --- State variables ---
  let SIMULATED_OTP = "123456"; // The fake OTP
  phoneVerified = false; // Use the global-like var

  // Initial state setup
  bookBtn.disabled = true;
  verifiedBadge.style.display = "none";
  otpSection.style.display = "none";


  // Helper to update UI state
  function updateVerificationState(verified) {
    phoneVerified = verified;
    verifiedBadge.style.display = verified ? "inline-flex" : "none";
    bookBtn.disabled = !verified;
    phoneInput.disabled = verified;
    if (verified) {
      sendBtn.textContent = "Verified";
      sendBtn.disabled = true;
      otpSection.style.display = "none";
      showToast("Phone number verified successfully!", "success");
    } else {
      sendBtn.textContent = "Send OTP";
      sendBtn.disabled = false;
      bookBtn.disabled = true;
    }
  }

  // --- 1. Send OTP Button Handler ---
  sendBtn &&
    sendBtn.addEventListener("click", () => {
      const phone = phoneInput.value;
      if (!validPhone(phone)) {
        showToast("Please enter a valid 10-digit phone number.", "error");
        return;
      }

      // Simulating the OTP sending process
      SIMULATED_OTP = Math.floor(100000 + Math.random() * 900000).toString(); // New random 6-digit OTP
      log("Simulated OTP sent:", SIMULATED_OTP); // Log for testing

      // Update UI
      otpSection.style.display = "flex"; // Show OTP input
      otpInput.value = ""; // Clear previous entry
      showToast(`Simulated OTP sent to ${phone}. Use: ${SIMULATED_OTP}`, "success");
      sendBtn.textContent = "Resend OTP";
      updateVerificationState(false);
    });

  // --- 2. Verify OTP Button Handler ---
  verifyBtn &&
    verifyBtn.addEventListener("click", () => {
      const enteredOtp = otpInput.value;
      if (enteredOtp === SIMULATED_OTP) {
        updateVerificationState(true); // Verification successful
      } else {
        showToast("Verification failed. Invalid OTP.", "error");
        updateVerificationState(false); // Verification failed
      }
    });

  // Optional: Reset verification if phone number changes
  phoneInput &&
    phoneInput.addEventListener("input", () => {
      // Only reset if already verified
      if (phoneVerified) {
          updateVerificationState(false);
      }
    });
}

/**
 * Fills a <select> element with options.
 */
function fillSelect(selectEl, items, placeholder) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  selectEl.appendChild(createOpt("", placeholder || "Choose..."));
  items.forEach((it) => selectEl.appendChild(createOpt(it, it)));
  selectEl.disabled = items.length === 0;
}

/**
 * Wires up the state/district/hospital dropdowns in the main appointment form.
 */
async function wireAppointmentFormCascades() {
  // appointment form uses ids: state, district, hospital
  const state = $id("state"),
    district = $id("district"),
    hospital = $id("hospital");
  if (!state || !district || !hospital) {
    warn("Appointment form selects not found:", !!state, !!district, !!hospital);
    return;
  }
  
  // Set min/max dates for form
  const today = new Date().toISOString().split("T")[0];
  if ($id("appointmentDate")) $id("appointmentDate").min = today;
  if ($id("dob")) $id("dob").max = today;
  
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  if ($id("appointmentDate")) $id("appointmentDate").max = maxDate.toISOString().split("T")[0];


  // populate states (same source)
  fillSelect(state, [], "Loading states...");
  const states = await getStatesList();
  fillSelect(state, states, "Choose a state");
  fillSelect(district, [], "Choose a state first");
  fillSelect(hospital, [], "Choose a district first");

  state.addEventListener("change", async () => {
    const s = state.value;
    if (!s) {
      fillSelect(district, [], "Choose a state first");
      fillSelect(hospital, [], "Choose a district first");
      return;
    }
    fillSelect(district, [], "Loading districts...");
    fillSelect(hospital, [], "Choose a district first");
    const districts = await getDistrictsForState(s);
    fillSelect(district, districts, "Choose district");
  });

  district.addEventListener("change", async () => {
    const s = state.value,
      d = district.value;
    if (!s || !d) {
      fillSelect(hospital, [], "Choose a district first");
      return;
    }
    fillSelect(hospital, [], "Loading hospitals...");
    const hospitals = await getHospitalsForStateAndDistrict(s, d);
    fillSelect(hospital, hospitals, "Choose hospital");
  });
}

/**
 * Wires up the "Find Hospitals" section (if present).
 */
async function wireFindHospitalsSection() {
  const stateSel = $id("stateSelect"),
    districtSel = $id("districtSelect"),
    hospitalSel = $id("hospitalSelect");
  if (!stateSel || !districtSel || !hospitalSel) {
    /* warn("Find Hospitals selects not found:", !!stateSel,!!districtSel,!!hospitalSel); */
    return; // Not fatal, this section might not exist
  }
  fillSelect(stateSel, [], "Loading states...");
  fillSelect(districtSel, [], "Select district");
  fillSelect(hospitalSel, [], "Select hospital");

  const states = await getStatesList();
  fillSelect(stateSel, states, "Select state");

  stateSel.addEventListener("change", async () => {
    const s = stateSel.value;
    if (!s) {
      fillSelect(districtSel, [], "Select district");
      fillSelect(hospitalSel, [], "Select hospital");
      return;
    }
    fillSelect(districtSel, [], "Loading districts...");
    const districts = await getDistrictsForState(s);
    fillSelect(districtSel, districts, "Select district");
    fillSelect(hospitalSel, [], "Select hospital");
  });

  districtSel.addEventListener("change", async () => {
    const s = stateSel.value,
      d = districtSel.value;
    if (!s || !d) {
      fillSelect(hospitalSel, [], "Select hospital");
      return;
    }
    fillSelect(hospitalSel, [], "Loading hospitals...");
    const hospitals = await getHospitalsForStateAndDistrict(s, d);
    fillSelect(hospitalSel, hospitals, "Select hospital");
  });
}

/**
 * Wires up any other small state/hospital selectors (if present).
 */
async function wireSmallAppointmentSelectors() {
  const stSmall = $id("stateSmall"),
    hospSmall = $id("hospitalSmall");
  if (!stSmall || !hospSmall) {
    /* not fatal */ return;
  }
  const states = await getStatesList();
  fillSelect(stSmall, states, "Choose state");
  stSmall.addEventListener("change", async () => {
    const s = stSmall.value;
    if (!s) {
      fillSelect(hospSmall, [], "Choose hospital");
      return;
    }
    const hospitals = await getAllHospitalsForState(s);
    fillSelect(hospSmall, hospitals, "Choose hospital");
  });
}

/**
 * Wires up the "Schemes" section.
 */
async function wireSchemeControls() {
  const schemeState = $id("schemeState") || $id("scheme-state-filter");
  const schemesContainer = $id("schemesContainer") || $id("schemes-grid");
  if (!schemeState || !schemesContainer) {
    warn("Schemes elements not found");
    return;
  }
  fillSelect(schemeState, [], "Loading...");
  const states = await getSchemeStates();
  fillSelect(schemeState, states, "All States (default)");
  async function load(s) {
    schemesContainer.innerHTML = "<p>Loading schemes...</p>";
    const list = await getSchemes(s);
    if (!list || list.length === 0) {
      schemesContainer.innerHTML =
        "<div class='empty-state'><h3>No schemes found for this selection.</h3></div>";
      return;
    }
    schemesContainer.innerHTML = "";
    list.forEach((item) => {
      const title =
        item["Scheme Name"] ||
        item.scheme_name ||
        item.Scheme ||
        item.title ||
        "Untitled";
      const desc = item.Description || item.description || item.desc || "";
      const el = document.createElement("div");
      el.className = "reward-card"; // Re-using your CSS
      el.innerHTML = `<div class="reward-content"><span class="reward-tag">${
        item["Target Audience"] || item.state || "All India"
      }</span><h3 class="reward-title">${title}</h3><p class="game-description">${desc}</p></div>`;
      schemesContainer.appendChild(el);
    });
  }
  await load(schemeState.value);
  schemeState.addEventListener("change", () => load(schemeState.value));
}

/**
 * Wires up the FAQ search functionality.
 */
function wireFaqSearch() {
  const inp = $id("faqSearch") || $id("faq-search-input");
  const container = $id("faqContainer") || $id("faq-accordion-container");
  if (!inp || !container) {
    warn("FAQ elements missing");
    return;
  }
  let to = null;
  inp.addEventListener("input", () => {
    clearTimeout(to);
    const q = inp.value || "";
    to = setTimeout(async () => {
      if (q.trim().length < 2) {
        container.innerHTML =
          "<div class='empty-state'><h3>Type at least 2 characters to search...</h3></div>";
        return;
      }
      container.innerHTML = "<p>Searching...</p>";
      const res = await searchFaqs(q);
      if (!res || res.length === 0) {
        container.innerHTML =
          "<div class='empty-state'><h3>No FAQs found matching your query.</h3></div>";
        return;
      }
      container.innerHTML = "";
      res.forEach((r) => {
        const qtxt = r.question || r.Question || r.q || "Question";
        const atxt = r.answer || r.Answer || r.a || "";
        const card = document.createElement("div");
        card.className = "accordion-item";
        card.innerHTML = `<button class="accordion-header">
                                <span>${qtxt}</span>
                                <i class="fas fa-chevron-down"></i>
                              </button>
                              <div class="accordion-content"><p>${atxt}</p></div>`;
        container.appendChild(card);
      });
      // Re-initialize accordion logic for these new dynamic items
      initializeAccordion();
    }, 300);
  });
}

/* ===== INITIALIZATION (Combined) ===== */
async function mainInit() {
  log("Init script starting. USE_APPS_SCRIPT=", USE_APPS_SCRIPT);

  // --- From chat.js ---
  initializeSidebar();
  initializeNavigation();
  initializeChat();
  initializeAccordion();
  initializeSpeechRecognition();
  initializeContactForm();

  // --- From script.js (and replacing chat.js logic) ---
  await wireFindHospitalsSection();
  await wireAppointmentFormCascades(); // This REPLACES initializeAppointmentForm
  wireOtpVerification(); // This is the new OTP logic
  await wireSmallAppointmentSelectors();
  await wireSchemeControls();
  wireFaqSearch();
  
  // This REPLACES initializeBookingStatus and loadBookings
  renderBookingsList(); 

  // This REPLACES the form logic in initializeAppointmentForm
  const form = $id("appointmentForm");
  if (form) {
    form.addEventListener("submit", handleAppointmentSubmit);
  } else {
    warn("Appointment form not found!");
  }

  log("Init complete");
}

document.addEventListener("DOMContentLoaded", mainInit);