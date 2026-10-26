# 🇮🇳 TerraFlow — India Subsurface Digital Twin & Critical Pipeline Intelligence Platform

> **"Real-time Pan-India mapping of natural gas grids (GAIL HVJ, Urja Ganga), crude oil pipelines (IOCL, BPCL), and municipal bulk water supply networks — with 2-Factor OTP verified access and native Chrome push incident alerts."**

---

## 🌟 Executive Overview & National Infrastructure Scope

India's subsurface infrastructure carries the nation's energy, water, and digital connectivity across millions of kilometers:
- **National Natural Gas Grid**: GAIL Hazira-Vijaipur-Jagdishpur (HVJ), Pradhan Mantri Urja Ganga (JHBDPL), East-West Pipeline (PIL), Kochi-Bengaluru (KKBMPL).
- **Crude & Petroleum Product Pipelines**: IOCL Salaya-Mathura (SMPL), Kandla-Bhatinda (KBPL), BPCL Mumbai-Manmad-Bijwasan (MMBPL).
- **Metropolitan & State Bulk Water Grids**: Delhi Jal Board 1500mm Master Transmission Feeder, Bangalore Water Supply Cauvery Scheme (CWSS Stages I-V), Mumbai BMC Vaitarna Mega-Tunnels (100m deep), Sardar Sarovar Narmada Bulk Water Grid (Gujarat).
- **National OFC Backbone**: BharatNet and National Knowledge Network (NKN) high-speed buried fiber conduits.
- **Himalayan Mountain Subsurface Pilot**: Manali, Shimla, Dharamshala, and Mussoorie mountain utility grids.

---

## 💡 Core Innovations of TerraFlow India

1. **Pan-India Map & Regional Grids**:
   - Covers the entire country with authentic geographic route coordinates, operators, pipe diameters, materials, and operating pressures.
   - Switch between **All India National Grid**, **Delhi NCR**, **Mumbai MMR**, **Bengaluru Urban**, and **Himachal Mountain Pilots**.
   - Integrated with **Google Maps Satellite/Terrain/Dark Blueprint** and Three.js 3D Subsurface visualization.

2. **Multi-Step 2-Factor OTP Verified Identity Gateway**:
   - Access is restricted until an account is created and verified.
   - **Step 1: Identity & Agency** (GAIL, IOCL, Jal Shakti, PWD, Municipal, Citizen Inspector).
   - **Step 2: Contact Verification** (Official Email & Indian 10-digit Mobile Number `+91`).
   - **Step 3: Real OTP Generation & Verification** (Real 6-digit cryptographic codes dispatched with visual SMS alert banner, live 120s timer, and server API validation).
   - **Step 4: Security Credentials** (Password & 4-digit Security PIN).
   - **Step 5: Security Clearance Pass** (Level 2/Level 3 Operator Clearance Certificate issued).

3. **Chrome & Mobile Native Web Push Notification System**:
   - Integrated with HTML5 Web Notifications API (`Notification.requestPermission()`).
   - Delivers instant push notifications to Windows/macOS laptops and mobile Chrome whenever an incident is reported anywhere in India.
   - Clicking any notification flies the national map directly to the incident coordinate.
   - In-app Notification Center drawer with live unread counter and test simulation trigger.

4. **Zero-Hardware AI Pipeline Risk & Failure Prioritization**:
   - Ranks pipelines (0–100) based on age, material degradation, terrain shear stress, monsoon pore saturation, and proximity to active citizen anomalies.

5. **"Check Before You Dig" Excavation Conflict & Permit Advisory**:
   - Conducts 3D spatial collision checks for contractors and PWD engineers to avoid catastrophic backhoe strikes against gas mains, water feeders, and 11kV cables.

1. **True 3D Subsurface Cutaway Map**:
   - Visualizes all buried utilities (water, sewer, electric, telecom, stormwater nullahs) with **exact burial depth (0.5m to 4m)**, pipe diameter, material, and slope gradient.
   - Transparent mountain terrain cutaway with depth slicing controls (0m to -5m) and dynamic camera angles.
   - **Data Provenance & Audit Trail**: Every record displays its origin agency (e.g. *Jal Shakti Vibhag Kullu Div 1984 Blueprint*, *Smart City As-Built GIS*, *HP PWD*) and verification level (`Verified`, `Unverified Legacy Record`, `Partially Potholed`, `Estimated`).

2. **AI Failure & Leak Risk Engine (Zero Hardware / Zero IoT Sensors!)**:
   - Analyzes 6 explainable vulnerability parameters to rank every pipe from 0 to 100:
     - 🧪 **Pipe Age & Material Degradation** (e.g., 42-year-old British/vintage Cast Iron vs modern HDPE)
     - 📐 **Mountain Slope & Shear Stress** (15° to 38° steep slopes create soil creep and joint tension)
     - 🌧️ **Monsoon Precipitation & Pore Pressure** (Live 24h rainfall simulation index)
     - 🔧 **Historical Repair Fatigue & Water Pressure** (Past bursts and high gravitational head)
     - 📣 **Citizen Ground-Truth Anomalies** (Proximity to reported wet patches, low pressure, and road subsidence)
     - 📑 **Data Uncertainty Penalty** (Legacy unverified blueprints receive proactive inspection priority)
   - **Inspection Priority Tiers**:
     - 🟢 **Low Risk (0–39)**: Standard routine monitoring.
     - 🟡 **Moderate Risk (40–69)**: Scheduled inspection priority within 14 days.
     - 🔴 **High Risk (70–100)**: Mandatory pre-dig verification & acoustic leak testing.
   - *Legal & Operational Clarity*: The model predicts **inspection priority**, not certified structural safety or legal permits.

3. **Community Ground-Truth Reporting Portal (Citizen & Field Crew)**:
   - Anyone can drop a pin to report **Wet Patches** (water bubbling between pavers), **Sudden Low Tap Pressure**, or **Road Subsidence / Dhasna**.
   - **Dynamic AI Feedback Loop**: Submitting a report instantly recalculates risk scores for all pipelines within a 65-meter radius and triggers alerts in the engineering queue.

4. **"Check Before You Dig" Excavation Conflict & Permit Advisory**:
   - Contractors or PWD engineers select a planned excavation trench (center coordinates, radius, and digging depth).
   - TerraFlow performs 3D collision detection against all underlying utility lines.
   - Flags critical conflicts (e.g., 11kV power line at 0.8m depth when digging to 1.8m).
   - Generates an instant **Excavation Safety Checklist & Utility Owner Clearance Matrix** with department hotlines.

5. **Universal Map Connector ("Connect to Any Map & Area")**:
   - Pre-loaded with realistic Himalayan town networks:
     - 🏔️ **Manali, HP** (Mall Road, Old Manali, Circuit House, Hadimba, Aleo)
     - 🏔️ **Shimla, HP** (The Ridge, Mall Road, Sanjauli)
     - 🏔️ **Dharamshala & McLeod Ganj, HP** (Temple Road, Bhagsu)
     - 🏔️ **Mussoorie & Landour, UK** (The Mall, Library Chowk)
   - **Connect Any Map Generator**: Enter any coordinates (e.g., Nainital, Gangtok, Leh, Almora) and TerraFlow automatically generates a realistic 3D subsurface infrastructure network along mountain terrain contours!

5. **Google Maps JavaScript API Integration (Live Photorealistic Maps)**:
   - Powered by official **Google Maps JavaScript API v3** with your API Key: `AIzaSyAdYXKzMoO-Ukx0K7xTx8GosxXRYf-f4BM`.
   - **Google Satellite Hybrid View**: Real satellite imagery of Manali, Himalayas, houses, and roads.
   - **Google Mountain Terrain View**: True elevation contours and relief shading.
   - **Google Dark Blueprint Mode**: Bespoke dark vector styling matching the Himalayan night theme.
   - **Google Places Autocomplete**: Type any location or street name to fly to it and synthesize underground infrastructure!
   - Automatic fallback to high-performance Leaflet GIS if offline.

---

## 🚀 How to Run the Prototype

No complex server setup, node installation, or build tools are required!

1. Open your web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Brave).
2. Double-click or open:
   ```
   e:\new pipe\index.html
   ```
3. Or serve locally with any static web server:
   ```bash
   # Python (if installed)
   python -m http.server 8000
   # Then open: http://localhost:8000
   ```

---

## 📁 Project Architecture & File Structure

```
e:\new pipe\
│
├── index.html                   # Master UI with 3D WebGL viewport, 2D Leaflet GIS, HUD & Modals
├── css/
│   └── styles.css               # Alpine dark mode, glassmorphism, neon conduits, responsive CSS
├── js/
│   ├── app.js                   # Master Controller, event dispatch, UI state management
│   ├── data/
│   │   ├── synthetic_data.js    # Pre-modeled Himalayan datasets (Manali, Shimla, Dharamshala, Mussoorie)
│   │   └── data_generator.js    # Universal Subsurface Generator for ANY custom location or map
│   └── engine/
│       ├── risk_model.js        # Explainable Multi-Factor AI Risk Scoring Engine (0 - 100)
│       ├── terrain_3d.js        # Three.js 3D Subsurface Digital Twin with depth slicing & raycasting
│       ├── map_gis.js           # 2D Leaflet Tactical GIS with Satellite/Topo/Dark layers
│       └── dig_safety.js        # "Check Before You Dig" 3D Excavation Conflict & Permit Engine
├── assets/
│   ├── terraflow_logo.svg       # Crisp vector brand logo
│   └── sample_photos/           # Visual assets for citizen ground-truth reports
└── README.md                    # This master documentation file
```

---

## 🔬 Mathematical Formulation of the AI Risk Model

$$\text{Risk Score} = \min\left(100, \; S_{\text{age/material}} + S_{\text{slope}} + S_{\text{rain}} + S_{\text{repairs}} + S_{\text{citizen}} + S_{\text{uncertainty}}\right)$$

Where:
- $S_{\text{age/material}} \in [0, 25]$: Normalized material degradation factor $\times$ age decay.
- $S_{\text{slope}} \in [0, 20]$: Terrain gradient shear stress index $\left(\frac{\text{Slope}^\circ}{38^\circ} \times 20\right)$.
- $S_{\text{rain}} \in [0, 20]$: 24h precipitation saturation $\left(\frac{\text{Rainfall}_{\text{mm}}}{90} \times 20\right) + \text{FreezeThaw Bonus}$.
- $S_{\text{repairs}} \in [0, 15]$: Past pipe burst count & internal hydraulic pressure head.
- $S_{\text{citizen}} \in [0, 15]$: Inverse distance weighted proximity to active wet patches and road subsidence flags within 65m.
- $S_{\text{uncertainty}} \in [0, 5]$: Legacy unverified records penalty to incentivize field verification.

---

## 📈 Roadmap & Commercialization Strategy

1. **Phase 1: Synthetic Prototype & Local Validation (Current)**
   - Validate UI/UX with PWD engineers, Jal Shakti Vibhag, and excavation contractors in Manali.
   - Demonstrate zero-hardware AI prioritization on realistic synthetic datasets.

2. **Phase 2: Supervised Pilot in Manali (Pilot Partnership)**
   - Digitize legacy paper blueprints from Jal Shakti Vibhag (Kullu/Manali Division) and HPSEBL.
   - Calibrate the AI model against real ground-truthed acoustic leak tests along Mall Road & Circuit House Road.

3. **Phase 3: Rollout Across Himachal Pradesh**
   - Expand to Shimla Municipal Corporation (SJPNL), Dharamshala Smart City, Kullu, Mandi, and Solan.
   - Establish role-based enterprise security with state government audit logging.

4. **Revenue Model**:
   - **SaaS Subscription for Municipalities & PWD**: Annual license for digital twin management and permit tracking.
   - **Paid Excavation Clearance Portal for Contractors**: Per-project conflict analysis report fee for private telecom, gas, and road-widening companies.
   - **State Disaster Management (DDMA) Resilience Module**: Monsoonal landslide-utility vulnerability mapping.
