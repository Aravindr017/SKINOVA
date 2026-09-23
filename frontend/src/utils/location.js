// ==========================================
// SKINOVA - Geolocation and Coordinate Helpers
// High Accuracy GPS + IP Fallback + City Geocoding
// ==========================================

export const getIPCoordinates = async () => {
  // 1. Primary IP geolocation: ipwho.is (Free, HTTPS, no auth, high accuracy in India/Kerala)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://ipwho.is/', {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.success !== false && data.latitude && data.longitude) {
        const city = data.city || data.region || "Thiruvananthapuram";
        const region = data.region || "Kerala";
        const locName = `${city}${region && region !== city ? ', ' + region : ''}`;
        return {
          lat: parseFloat(data.latitude),
          lon: parseFloat(data.longitude),
          lng: parseFloat(data.longitude),
          accuracy: 1000,
          city: locName,
          isIP: true,
        };
      }
    }
  } catch (err) {
    console.warn("Primary ipwho.is lookup failed, trying fallback:", err.message);
  }

  // 2. Secondary IP service: ipapi.co
  try {
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 3000);
    const res2 = await fetch('https://ipapi.co/json/', {
      headers: { 'User-Agent': 'Skinnova-Dermatology-App/1.0' },
      signal: controller2.signal,
    });
    clearTimeout(timeoutId2);
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2.latitude && data2.longitude && !data2.error) {
        const city = data2.city || data2.region || "Thiruvananthapuram";
        const region = data2.region || "Kerala";
        return {
          lat: parseFloat(data2.latitude),
          lon: parseFloat(data2.longitude),
          lng: parseFloat(data2.longitude),
          accuracy: 1000,
          city: `${city}${region && region !== city ? ', ' + region : ''}`,
          isIP: true,
        };
      }
    }
  } catch {}

  // 3. Fallback: Genuine Thiruvananthapuram / Kerala coordinates
  return {
    lat: 8.5241,
    lon: 76.9366,
    lng: 76.9366,
    accuracy: 3000,
    city: "Thiruvananthapuram, Kerala",
    isIP: true,
  };
};

export const getUserCoordinates = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      getIPCoordinates().then(resolve);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        resolve({
          lat,
          lon,
          lng: lon,
          accuracy: position.coords.accuracy,
          isGPS: true,
        });
      },
      async (error) => {
        console.warn("Browser GPS unavailable or timed out, falling back to IP Geolocation:", error.message);
        const ipCoords = await getIPCoordinates();
        resolve(ipCoords);
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 30000,
      }
    );
  });
};

export const getCityFromCoordinates = async (lat, lonOrLng) => {
  const lon = lonOrLng;
  if (lat == null || lon == null) return "Your Vicinity";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Skinnova-Dermatology-App/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error("Reverse geocoding failed");
    const data = await res.json();
    const addr = data.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.county ||
      addr.state_district ||
      addr.state ||
      "Current Location";
    const stateOrCountry = addr.state || addr.country || "";
    return `${city}${stateOrCountry && stateOrCountry !== city ? ', ' + stateOrCountry : ''}`;
  } catch (err) {
    console.warn("Could not reverse geocode:", err.message);
    return "Nearby Healthcare Area";
  }
};

export const geocodeLocationQuery = async (query) => {
  if (!query || !query.trim()) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const clean = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${clean}&format=json&limit=1&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Skinnova-Dermatology-App/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error("Geocoding failed");
    const data = await res.json();
    if (data && data.length > 0) {
      const item = data[0];
      const addr = item.address || {};
      const cityName =
        addr.city ||
        addr.town ||
        addr.suburb ||
        addr.state_district ||
        addr.state ||
        item.display_name.split(',')[0];
      const state = addr.state || addr.country || '';
      return {
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        lng: parseFloat(item.lon),
        displayName: `${cityName}${state && state !== cityName ? ', ' + state : ''}`,
        fullAddress: item.display_name,
      };
    }
  } catch (err) {
    console.warn("Location query geocoding failed:", err.message);
  }
  return null;
};
