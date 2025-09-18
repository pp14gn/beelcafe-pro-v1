import { useState, useEffect } from 'react';

interface Settings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  autoPrintReceipts: boolean;
  soundNotifications: boolean;
  lowStockAlerts: boolean;
  requireManagerApproval: boolean;
  autoLogout: boolean;
  backupFrequency: string;
  // MercadoPago Point Settings
  pointUserId: string;
  pointClientId: string;
  pointEnabled: boolean;
  selectedStoreId: string;
  selectedPosId: string;
  selectedTerminalId: string;
}

const DEFAULT_SETTINGS: Settings = {
  storeName: 'Coffee Roasters & Co.',
  storeAddress: '123 Main Street, Coffee City',
  storePhone: '(555) 123-4567',
  storeEmail: 'info@coffeeroasters.com',
  autoPrintReceipts: true,
  soundNotifications: true,
  lowStockAlerts: true,
  requireManagerApproval: true,
  autoLogout: false,
  backupFrequency: 'Daily at 2:00 AM',
  // MercadoPago Point Defaults
  pointUserId: '',
  pointClientId: '',
  pointEnabled: false,
  selectedStoreId: '',
  selectedPosId: '',
  selectedTerminalId: ''
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('posSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      localStorage.setItem('posSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem('posSettings');
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  };

  return {
    settings,
    updateSettings,
    resetToDefaults,
    isLoading
  };
};