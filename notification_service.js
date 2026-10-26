/**
 * TerraFlow - Real-Time Push Notification & Incident Dispatch Service
 * Delivers native desktop & mobile Chrome notifications for pipeline bursts,
 * pressure anomalies, gas leaks, and citizen reports across India.
 * Enhanced with Service Worker support for Background & Device-off alerts.
 */

class TerraFlowNotificationService {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.permissionState = 'default'; // 'default', 'granted', 'denied'
    this.hasAudioPermission = false;
    this.serviceWorkerReg = null;

    this.checkPermission();
    this.initServiceWorker();
    this.loadInitialNotifications();
  }

  checkPermission() {
    if ('Notification' in window) {
      this.permissionState = Notification.permission;
    } else {
      this.permissionState = 'unsupported';
    }
  }

  initServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(reg => {
        this.serviceWorkerReg = reg;
        console.log('[TerraFlow SW] Background notification worker active:', reg.scope);
      }).catch(err => {
        console.log('[TerraFlow SW] Service worker note:', err);
      });
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      alert('Your browser does not support native desktop push notifications. In-app alerts will be used.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionState = permission;
      this.updateUIBadge();

      if (permission === 'granted') {
        this.playAlertTone();
        // Fire real test notification on the device
        this.showNativeNotification({
          title: '🚨 TerraFlow India — Live Device Alerts Enabled',
          body: 'You are now registered to receive real-time alerts for gas pipeline leaks, water bursts, and citizen ground reports across India, even when Chrome is backgrounded.',
          tag: 'terraflow_welcome'
        });
        return true;
      } else {
        alert('Notification permission was not granted. Please click the lock or tune icon in the Chrome address bar to Allow Notifications.');
        return false;
      }
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return false;
    }
  }

  showNativeNotification({ title, body, tag, lat, lng }) {
    if (this.permissionState !== 'granted') return;

    const options = {
      body: body,
      icon: 'assets/terraflow_logo.svg',
      badge: 'assets/terraflow_logo.svg',
      tag: tag || `terraflow_${Date.now()}`,
      renotify: true,
      vibrate: [300, 100, 300, 100, 400], // Mobile device vibration
      requireInteraction: true,
      data: { lat, lng, url: '/index.html' }
    };

    // 1. Prefer Service Worker registration (delivers to device even if Chrome tab is closed/backgrounded)
    if (this.serviceWorkerReg && this.serviceWorkerReg.showNotification) {
      this.serviceWorkerReg.showNotification(title, options).catch(() => {
        this.fallbackNativeNotification(title, options, lat, lng);
      });
    } else if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, options);
      }).catch(() => {
        this.fallbackNativeNotification(title, options, lat, lng);
      });
    } else {
      this.fallbackNativeNotification(title, options, lat, lng);
    }
  }

  fallbackNativeNotification(title, options, lat, lng) {
    try {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (lat && lng && window.app) {
          window.app.flyToLocation(lat, lng);
        }
      };
    } catch (e) {
      console.warn('Standard notification error:', e);
    }
  }

  playAlertTone() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Distinct alert siren chirp
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  dispatchIncidentAlert(incident) {
    this.playAlertTone();

    // 1. Native OS / Chrome Notification (Service Worker powered)
    this.showNativeNotification({
      title: `🚨 ${incident.severity === 'high' ? 'CRITICAL ALERT' : 'INCIDENT'}: ${incident.title}`,
      body: `📍 ${incident.location || 'India Network'}\n${incident.description.substring(0, 120)}... Click to inspect.`,
      tag: incident.id,
      lat: incident.lat,
      lng: incident.lng
    });

    // 2. In-App Notification Center Entry
    const item = {
      id: incident.id || `ALERT-${Date.now()}`,
      title: incident.title,
      location: incident.location || 'India Subsurface Grid',
      severity: incident.severity || 'high',
      time: 'Just now',
      timestamp: Date.now(),
      lat: incident.lat,
      lng: incident.lng,
      read: false
    };

    this.notifications.unshift(item);
    this.unreadCount++;
    this.updateUIBadge();
    this.renderNotificationDrawer();

    // 3. Floating In-App Toast
    this.showToastAlert(item);
  }

  showToastAlert(item) {
    const toastId = 'tf-live-incident-toast';
    let toast = document.getElementById(toastId);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = toastId;
      toast.className = 'tf-incident-toast';
      document.body.appendChild(toast);
    }

    const sevColor = item.severity === 'high' ? '#ef4444' : '#f59e0b';
    toast.innerHTML = `
      <div class="toast-inner" style="border-left: 4px solid ${sevColor};">
        <div class="toast-icon">🚨</div>
        <div class="toast-text">
          <div class="toast-title">${item.title}</div>
          <div class="toast-sub">${item.location} &bull; <span style="color:${sevColor}; text-transform:uppercase; font-weight:700;">${item.severity} Risk</span></div>
        </div>
        <button class="toast-action" onclick="window.app.flyToLocation(${item.lat}, ${item.lng})">Inspect Map</button>
        <button class="toast-close" onclick="document.getElementById('${toastId}').style.display='none';">&times;</button>
      </div>
    `;

    toast.style.display = 'block';
    toast.classList.add('fade-in');

    setTimeout(() => {
      if (toast) toast.style.display = 'none';
    }, 8000);
  }

  loadInitialNotifications() {
    this.notifications = [
      {
        id: 'NOTIF-01',
        title: 'Severe Gas Pressure Anomaly & Hydrocarbon Odor Flagged',
        location: 'Ankleshwar GIDC Industrial Corridor, Gujarat (GAIL HVJ Trunk)',
        severity: 'high',
        time: '12m ago',
        lat: 21.6412,
        lng: 73.0412,
        read: false
      },
      {
        id: 'NOTIF-02',
        title: 'Major Water Main Cavitation & Road Subsidence',
        location: 'Moolchand Flyover Intersection, New Delhi (DJB 1500mm Main)',
        severity: 'high',
        time: '45m ago',
        lat: 28.5684,
        lng: 77.2432,
        read: false
      },
      {
        id: 'NOTIF-03',
        title: 'Surface Water Seepage over High-Tension Transmission Corridor',
        location: 'Kengeri Satellite Town, Bengaluru (Cauvery Grid Stage IV)',
        severity: 'medium',
        time: '2h ago',
        lat: 12.8251,
        lng: 77.4912,
        read: true
      }
    ];
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  updateUIBadge() {
    const badge = document.getElementById('notif-badge-count');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.innerText = this.unreadCount;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }

    const bellBtn = document.getElementById('btn-notif-bell');
    if (bellBtn) {
      if (this.permissionState === 'granted') {
        bellBtn.classList.add('notif-active');
        bellBtn.title = 'Live Push Notifications Active (Device / Mobile / Chrome)';
      } else {
        bellBtn.classList.remove('notif-active');
        bellBtn.title = 'Click to Allow Device Push Notifications';
      }
    }
  }

  renderNotificationDrawer() {
    const list = document.getElementById('notif-drawer-list');
    if (!list) return;

    if (this.notifications.length === 0) {
      list.innerHTML = `<div class="notif-empty">No active incident notifications.</div>`;
      return;
    }

    list.innerHTML = this.notifications.map(n => `
      <div class="notif-drawer-item ${n.read ? 'read' : 'unread'}" onclick="window.notificationService.handleNotifClick('${n.id}', ${n.lat}, ${n.lng})">
        <div class="notif-item-header">
          <span class="notif-dot ${n.severity}"></span>
          <strong class="notif-item-title">${n.title}</strong>
          <span class="notif-item-time">${n.time}</span>
        </div>
        <div class="notif-item-loc">📍 ${n.location}</div>
      </div>
    `).join('');
  }

  handleNotifClick(id, lat, lng) {
    const target = this.notifications.find(n => n.id === id);
    if (target) target.read = true;
    this.unreadCount = this.notifications.filter(n => !n.read).length;
    this.updateUIBadge();
    this.renderNotificationDrawer();
    this.toggleDrawer(false);

    if (lat && lng && window.app) {
      window.app.flyToLocation(lat, lng);
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.unreadCount = 0;
    this.updateUIBadge();
    this.renderNotificationDrawer();
  }

  toggleDrawer(show) {
    const drawer = document.getElementById('notif-drawer-panel');
    if (!drawer) return;

    if (show !== undefined) {
      drawer.style.display = show ? 'block' : 'none';
    } else {
      drawer.style.display = (drawer.style.display === 'block') ? 'none' : 'block';
    }

    if (drawer.style.display === 'block') {
      this.renderNotificationDrawer();
    }
  }

  simulateLiveAlert() {
    const sampleIncidents = [
      {
        id: `ALERT-${Date.now()}`,
        title: 'High Pressure Drop on GAIL Hazira-Vijaipur Gas Pipeline',
        location: 'Vadodara Compressor Station, Gujarat (KM 142)',
        severity: 'high',
        lat: 22.3072,
        lng: 73.1812,
        description: 'SCADA sensors flagged abnormal gravitational vibration and 14% pressure variance in 36-inch transmission feeder.'
      },
      {
        id: `ALERT-${Date.now()}`,
        title: 'Water Main Burst Alert & Street Seepage',
        location: 'Ring Road Underpass near Kashmere Gate, New Delhi',
        severity: 'high',
        lat: 28.6712,
        lng: 77.2412,
        description: 'Citizen report verified: 2000 liters/min drinking water surfacing through asphalt pavers near electrical box.'
      },
      {
        id: `ALERT-${Date.now()}`,
        title: 'Road Subsidence above Middle Vaitarna Water Tunnel',
        location: 'Eastern Express Highway Corridor, Thane, Maharashtra',
        severity: 'high',
        lat: 19.2152,
        lng: 72.9812,
        description: 'Road depression flagged by traffic police directly over BMC subsurface utility corridor.'
      }
    ];

    const pick = sampleIncidents[Math.floor(Math.random() * sampleIncidents.length)];
    this.dispatchIncidentAlert(pick);
  }

  /**
   * Schedule Background Alert: allows user to minimize/close Chrome and verify alert on device!
   */
  scheduleBackgroundAlert(countdownSeconds = 5) {
    if (this.permissionState !== 'granted') {
      this.requestPermission().then(granted => {
        if (granted) this.startBackgroundTimer(countdownSeconds);
      });
    } else {
      this.startBackgroundTimer(countdownSeconds);
    }
  }

  startBackgroundTimer(sec) {
    alert(`⏳ Background Alert Armed!\n\nMinimize or switch away from Chrome NOW!\nIn ${sec} seconds, a background alert will buzz on your device/Windows Action Center.`);

    setTimeout(() => {
      this.playAlertTone();
      this.showNativeNotification({
        title: '🚨 BACKGROUND ALERT: Piped Gas Anomaly (GAIL Grid)',
        body: 'Alert delivered while Chrome was in background/minimized. Click to open TerraFlow India and inspect telemetry coordinates.',
        tag: `bg_test_${Date.now()}`,
        lat: 22.3072,
        lng: 73.1812
      });
    }, sec * 1000);
  }
}

// Global Notification Singleton
window.notificationService = new TerraFlowNotificationService();
