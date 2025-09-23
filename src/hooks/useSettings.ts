import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  // Operating Hours
  openTime: string;
  closeTime: string;
  operatingDays: string[];
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
  // Operating Hours Defaults
  openTime: '08:00',
  closeTime: '18:00',
  operatingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
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

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading settings from Supabase:', error);
          // Fall back to localStorage for existing users
          const savedSettings = localStorage.getItem('posSettings');
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            // Migrate to Supabase
            await migrateSettingsToSupabase(parsed);
          }
        } else if (data && data.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...(data.settings as Partial<Settings>) });
        }
      } else {
        // User not authenticated, use localStorage as fallback
        const savedSettings = localStorage.getItem('posSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const migrateSettingsToSupabase = async (localSettings: Partial<Settings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            settings: localSettings
          });
        // Clear localStorage after successful migration
        localStorage.removeItem('posSettings');
      }
    } catch (error) {
      console.error('Error migrating settings to Supabase:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    console.log('updateSettings called with:', newSettings);
    const updatedSettings = { ...settings, ...newSettings };
    console.log('Updated settings will be:', updatedSettings);
    setSettings(updatedSettings);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            settings: updatedSettings
          }, {
            onConflict: 'user_id'
          });
        
        if (error) {
          console.error('Error saving settings to Supabase:', error);
          // Fall back to localStorage
          localStorage.setItem('posSettings', JSON.stringify(updatedSettings));
        } else {
          console.log('Settings saved to Supabase successfully');
        }
      } else {
        // User not authenticated, save to localStorage
        localStorage.setItem('posSettings', JSON.stringify(updatedSettings));
        console.log('Settings saved to localStorage (user not authenticated)');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      // Fall back to localStorage
      localStorage.setItem('posSettings', JSON.stringify(updatedSettings));
    }
  };

  const resetToDefaults = async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('user_settings')
          .delete()
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Error resetting settings in Supabase:', error);
        }
      }
      
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