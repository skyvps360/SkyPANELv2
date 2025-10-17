/**
 * Settings Page
 * User and organization settings management
 */

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building, 
  Key, 
  Bell, 
  Shield, 
  CreditCard,
  Save,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { toast } from 'sonner';
// Navigation provided by AppLayout
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Settings: React.FC = () => {
  const { 
    user, 
    updateProfile, 
    getOrganization,
    updateOrganization, 
    changePassword, 
    updatePreferences, 
    getApiKeys, 
    createApiKey, 
    revokeApiKey 
  } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState<{[key: string]: boolean}>({});
  const [newlyCreatedKeys, setNewlyCreatedKeys] = useState<{[key: string]: string}>({});
  const [revokeModal, setRevokeModal] = useState<{isOpen: boolean, keyId: string, keyName: string}>({
    isOpen: false,
    keyId: '',
    keyName: ''
  });

  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    timezone: user?.timezone || 'UTC'
  });

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        timezone: user.timezone || 'UTC'
      });
    }
  }, [user]);

  // Organization settings
  const [orgData, setOrgData] = useState({
    name: '',
    website: '',
    address: '',
    taxId: ''
  });

  // Security settings
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  });

  // Notification settings
  const [notificationData, setNotificationData] = useState({
    emailNotifications: true,
    smsNotifications: false,
    containerAlerts: true,
    billingAlerts: true,
    securityAlerts: true,
    maintenanceAlerts: true
  });

  // API settings
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newApiKeyName, setNewApiKeyName] = useState('');

  // Load API keys on mount
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        const keys = await getApiKeys();
        setApiKeys(keys);
      } catch (error) {
        console.error('Failed to load API keys:', error);
      }
    };
    loadApiKeys();
  }, [getApiKeys]);

  // Load organization data on mount
  useEffect(() => {
    const loadOrganizationData = async () => {
      try {
        const organization = await getOrganization();
        setOrgData({
          name: organization.name || '',
          website: organization.website || '',
          address: organization.address || '',
          taxId: organization.taxId || ''
        });
      } catch (error) {
        console.error('Failed to load organization data:', error);
        // Keep empty values if loading fails
      }
    };
    loadOrganizationData();
  }, [getOrganization]);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'organization', name: 'Organization', icon: Building },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'api', name: 'API Keys', icon: Key }
  ];

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateProfile({ 
        firstName: profileData.firstName, 
        lastName: profileData.lastName,
        phone: profileData.phone,
        timezone: profileData.timezone
      });
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrganization = async () => {
    setLoading(true);
    try {
      await updateOrganization(
        orgData.name,
        orgData.website,
        orgData.address,
        orgData.taxId
      );
      toast.success('Organization settings updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (!securityData.currentPassword || !securityData.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    setLoading(true);
    try {
      await changePassword(securityData.currentPassword, securityData.newPassword);
      setSecurityData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      toast.success('Password changed successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      await updatePreferences({
        notifications: {
          email: notificationData.emailNotifications,
          sms: notificationData.smsNotifications,
          containerAlerts: notificationData.containerAlerts,
          billingAlerts: notificationData.billingAlerts,
          securityAlerts: notificationData.securityAlerts,
          maintenanceAlerts: notificationData.maintenanceAlerts
        }
      });
      toast.success('Notification preferences updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyApiKey = (keyId: string, key: string) => {
    // For newly created keys, copy the full key. For existing keys, copy the preview
    const fullKey = newlyCreatedKeys[keyId] || key;
    navigator.clipboard.writeText(fullKey);
    toast.success('API key copied to clipboard');
  };

  const handleCreateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setLoading(true);
    try {
      const newKey = await createApiKey(newApiKeyName);
      setApiKeys(prev => [...prev, newKey]);
      // Store the full key for this session only
      if (newKey.key) {
        setNewlyCreatedKeys(prev => ({ ...prev, [newKey.id]: newKey.key }));
      }
      setNewApiKeyName('');
      toast.success('API key created successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    setLoading(true);
    try {
      await revokeApiKey(keyId);
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      // Remove from newly created keys if it exists
      setNewlyCreatedKeys(prev => {
        const updated = { ...prev };
        delete updated[keyId];
        return updated;
      });
      setRevokeModal({ isOpen: false, keyId: '', keyName: '' });
      toast.success('API key revoked successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to revoke API key');
    } finally {
      setLoading(false);
    }
  };

  const openRevokeModal = (keyId: string, keyName: string) => {
    setRevokeModal({ isOpen: true, keyId, keyName });
  };

  const closeRevokeModal = () => {
    setRevokeModal({ isOpen: false, keyId: '', keyName: '' });
  };

  const toggleApiKeyVisibility = (keyId: string) => {
    setShowApiKey(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const getDisplayKey = (key: any) => {
    const isVisible = showApiKey[key.id];
    const hasFullKey = newlyCreatedKeys[key.id];
    
    if (!isVisible) {
      return '••••••••••••••••••••••••••••••••';
    }
    
    if (hasFullKey) {
      return newlyCreatedKeys[key.id];
    }
    
    return key.key_preview || key.key;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    title="Email changes are not supported in the current schema"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Timezone
                  </label>
                  <select
                    value={profileData.timezone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'organization':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Organization Details</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={orgData.name}
                    onChange={(e) => setOrgData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={orgData.website}
                    onChange={(e) => setOrgData(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <textarea
                    value={orgData.address}
                    onChange={(e) => setOrgData(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    value={orgData.taxId}
                    onChange={(e) => setOrgData(prev => ({ ...prev, taxId: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={handleSaveOrganization}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={securityData.currentPassword}
                    onChange={(e) => setSecurityData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={securityData.newPassword}
                    onChange={(e) => setSecurityData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={securityData.confirmPassword}
                    onChange={(e) => setSecurityData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={loading || !securityData.currentPassword || !securityData.newPassword || !securityData.confirmPassword}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>

            <div className="border-t dark:border-gray-700 pt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Two-Factor Authentication</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securityData.twoFactorEnabled}
                    onChange={(e) => setSecurityData(prev => ({ ...prev, twoFactorEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationData.emailNotifications}
                      onChange={(e) => setNotificationData(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">SMS Notifications</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via SMS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationData.smsNotifications}
                      onChange={(e) => setNotificationData(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="border-t dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Alert Types</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'containerAlerts', label: 'Container Alerts', description: 'Container status changes and issues' },
                      { key: 'billingAlerts', label: 'Billing Alerts', description: 'Payment and billing notifications' },
                      { key: 'securityAlerts', label: 'Security Alerts', description: 'Security-related notifications' },
                      { key: 'maintenanceAlerts', label: 'Maintenance Alerts', description: 'Scheduled maintenance notifications' }
                    ].map((alert) => (
                      <div key={alert.key} className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white">{alert.label}</h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{alert.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationData[alert.key as keyof typeof notificationData] as boolean}
                            onChange={(e) => setNotificationData(prev => ({ ...prev, [alert.key]: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={handleSaveNotifications}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">API Keys</h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Shield className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Keep your API keys secure
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <p>
                        API keys provide access to your account. Keep them secure and never share them publicly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Create new API key */}
              <div className="border dark:border-gray-700 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Create New API Key</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter API key name"
                    value={newApiKeyName}
                    onChange={(e) => setNewApiKeyName(e.target.value)}
                    className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleCreateApiKey}
                    disabled={loading || !newApiKeyName.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>

              {/* Existing API keys */}
              <div className="space-y-4">
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Key className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>No API keys found. Create your first API key above.</p>
                  </div>
                ) : (
                  apiKeys.map((key) => (
                    <div key={key.id} className="border dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{key.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Created {new Date(key.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                          Active
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={getDisplayKey(key)}
                            readOnly
                            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                          />
                        </div>
                        <button
                          onClick={() => toggleApiKeyVisibility(key.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                          title={showApiKey[key.id] ? 'Hide API key' : 'Show API key'}
                        >
                          {showApiKey[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleCopyApiKey(key.id, key.key_preview || key.key)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                          title="Copy API key"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Security notice for existing keys */}
                      {!newlyCreatedKeys[key.id] && showApiKey[key.id] && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                          <div className="flex">
                            <Shield className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                              <p className="font-medium">Security Notice</p>
                              <p>For security reasons, only the prefix of existing API keys can be displayed. The full key was only shown when it was first created.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => openRevokeModal(key.id, key.name)}
                          disabled={loading}
                          className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-red-500 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {loading ? 'Revoking...' : 'Revoke'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Revocation Confirmation Modal */}
            {revokeModal.isOpen && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          Revoke API Key
                        </h3>
                      </div>
                      <button
                        onClick={closeRevokeModal}
                        className="ml-auto flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="mb-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Are you sure you want to revoke the API key:
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded border">
                        {revokeModal.keyName}
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                        This action cannot be undone. Any applications using this key will lose access immediately.
                      </p>
                    </div>

                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={closeRevokeModal}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRevokeApiKey(revokeModal.keyId)}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {loading ? 'Revoking...' : 'Revoke API Key'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );



      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeTab === tab.id
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg border dark:border-gray-700">
              <div className="px-6 py-6">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;