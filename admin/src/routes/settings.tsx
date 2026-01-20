import { useState, useEffect, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { RouteGuard } from '~/components';
import { usePermissions } from '~/hooks';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

/**
 * Settings type matching the backend schema.
 */
interface Settings {
  _id: string | null;
  defaultLocale: string;
  availableLocales: string[];
  features: {
    versioning: boolean;
    scheduling: boolean;
    localization: boolean;
    mediaManagement: boolean;
  };
  updatedBy?: string;
  _creationTime?: number;
}

/**
 * Available locale options for the select dropdown.
 */
const LOCALE_OPTIONS = [
  { value: 'en', label: 'English (en)' },
  { value: 'es', label: 'Spanish (es)' },
  { value: 'fr', label: 'French (fr)' },
  { value: 'de', label: 'German (de)' },
  { value: 'it', label: 'Italian (it)' },
  { value: 'pt', label: 'Portuguese (pt)' },
  { value: 'zh', label: 'Chinese (zh)' },
  { value: 'ja', label: 'Japanese (ja)' },
];

/**
 * Status feedback type for user notifications.
 */
type FeedbackStatus = 'idle' | 'saving' | 'saved' | 'error';

function SettingsPage() {
  const { canManageSettings } = usePermissions();
  const canEdit = canManageSettings();

  // Fetch settings from backend
  const settings = useQuery(api.settings.get);
  const updateSettings = useMutation(api.settings.update);
  const resetSettings = useMutation(api.settings.reset);

  // Local form state
  const [formData, setFormData] = useState<Settings | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form data when settings load
  useEffect(() => {
    if (settings && !formData) {
      setFormData(settings as Settings);
    }
  }, [settings, formData]);

  // Reset form when settings change externally (e.g., after reset)
  useEffect(() => {
    if (settings && !isDirty) {
      setFormData(settings as Settings);
    }
  }, [settings, isDirty]);

  /**
   * Handle locale selection change.
   */
  const handleLocaleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!formData) return;

    setFormData({
      ...formData,
      defaultLocale: e.target.value,
    });
    setIsDirty(true);
    setFeedbackStatus('idle');
  }, [formData]);

  /**
   * Handle feature toggle change.
   */
  const handleFeatureChange = useCallback((feature: keyof Settings['features']) => {
    if (!formData) return;

    setFormData({
      ...formData,
      features: {
        ...formData.features,
        [feature]: !formData.features[feature],
      },
    });
    setIsDirty(true);
    setFeedbackStatus('idle');
  }, [formData]);

  /**
   * Save settings to backend.
   */
  const handleSave = useCallback(async () => {
    if (!formData || !isDirty) return;

    setFeedbackStatus('saving');
    setErrorMessage(null);

    try {
      await updateSettings({
        defaultLocale: formData.defaultLocale,
        features: formData.features,
      });

      setFeedbackStatus('saved');
      setIsDirty(false);

      // Reset feedback after delay
      setTimeout(() => {
        setFeedbackStatus('idle');
      }, 3000);
    } catch (error) {
      setFeedbackStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save settings'
      );
    }
  }, [formData, isDirty, updateSettings]);

  /**
   * Reset settings to defaults.
   */
  const handleReset = useCallback(async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset all settings to their defaults? This action cannot be undone.'
    );

    if (!confirmed) return;

    setFeedbackStatus('saving');
    setErrorMessage(null);

    try {
      const newSettings = await resetSettings({});
      setFormData(newSettings as Settings);
      setFeedbackStatus('saved');
      setIsDirty(false);

      setTimeout(() => {
        setFeedbackStatus('idle');
      }, 3000);
    } catch (error) {
      setFeedbackStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to reset settings'
      );
    }
  }, [resetSettings]);

  /**
   * Discard unsaved changes.
   */
  const handleDiscard = useCallback(() => {
    if (settings) {
      setFormData(settings as Settings);
      setIsDirty(false);
      setFeedbackStatus('idle');
      setErrorMessage(null);
    }
  }, [settings]);

  // Loading state
  if (settings === undefined) {
    return (
      <RouteGuard requiredPermission={{ resource: 'settings', action: 'manage' }}>
        <div className="page settings-page">
          <header className="page-header">
            <h1>Settings</h1>
            <p className="page-description">
              Configure your CMS settings and preferences.
            </p>
          </header>
          <div className="settings-loading">
            <div className="loading-spinner" />
            <p>Loading settings...</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  // Error state (settings query failed)
  if (settings === null && !formData) {
    return (
      <RouteGuard requiredPermission={{ resource: 'settings', action: 'manage' }}>
        <div className="page settings-page">
          <header className="page-header">
            <h1>Settings</h1>
            <p className="page-description">
              Configure your CMS settings and preferences.
            </p>
          </header>
          <div className="settings-error">
            <p>Failed to load settings. Please try refreshing the page.</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requiredPermission={{ resource: 'settings', action: 'manage' }}>
      <div className="page settings-page">
        <header className="page-header">
          <div className="page-header-content">
            <h1>Settings</h1>
            <p className="page-description">
              Configure your CMS settings and preferences.
            </p>
          </div>

          {/* Action buttons and feedback */}
          {canEdit && (
            <div className="settings-actions">
              {feedbackStatus === 'saved' && (
                <span className="settings-feedback settings-feedback--success">
                  Settings saved successfully
                </span>
              )}
              {feedbackStatus === 'error' && (
                <span className="settings-feedback settings-feedback--error">
                  {errorMessage || 'An error occurred'}
                </span>
              )}

              {isDirty && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDiscard}
                  disabled={feedbackStatus === 'saving'}
                >
                  Discard Changes
                </button>
              )}

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!isDirty || feedbackStatus === 'saving'}
              >
                {feedbackStatus === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </header>

        <div className="settings-sections">
          {/* General Settings */}
          <section className="settings-section">
            <h2>General</h2>
            <div className="settings-group">
              <label className="setting-item">
                <span className="setting-label">Default Locale</span>
                <span className="setting-description">
                  The default language for new content entries.
                </span>
                <select
                  className="setting-input form-select"
                  value={formData?.defaultLocale || 'en'}
                  onChange={handleLocaleChange}
                  disabled={!canEdit || feedbackStatus === 'saving'}
                >
                  {LOCALE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Feature Settings */}
          <section className="settings-section">
            <h2>Features</h2>
            <div className="settings-group">
              <label className="setting-item checkbox">
                <input
                  type="checkbox"
                  checked={formData?.features.versioning ?? true}
                  onChange={() => handleFeatureChange('versioning')}
                  disabled={!canEdit || feedbackStatus === 'saving'}
                />
                <div className="checkbox-content">
                  <span className="setting-label">Enable Versioning</span>
                  <span className="setting-description">
                    Track content history and enable rollback to previous versions
                  </span>
                </div>
              </label>

              <label className="setting-item checkbox">
                <input
                  type="checkbox"
                  checked={formData?.features.scheduling ?? true}
                  onChange={() => handleFeatureChange('scheduling')}
                  disabled={!canEdit || feedbackStatus === 'saving'}
                />
                <div className="checkbox-content">
                  <span className="setting-label">Enable Scheduling</span>
                  <span className="setting-description">
                    Schedule content to publish at a future date and time
                  </span>
                </div>
              </label>

              <label className="setting-item checkbox">
                <input
                  type="checkbox"
                  checked={formData?.features.localization ?? false}
                  onChange={() => handleFeatureChange('localization')}
                  disabled={!canEdit || feedbackStatus === 'saving'}
                />
                <div className="checkbox-content">
                  <span className="setting-label">Enable Localization</span>
                  <span className="setting-description">
                    Support multiple languages for content entries
                  </span>
                </div>
              </label>

              <label className="setting-item checkbox">
                <input
                  type="checkbox"
                  checked={formData?.features.mediaManagement ?? true}
                  onChange={() => handleFeatureChange('mediaManagement')}
                  disabled={!canEdit || feedbackStatus === 'saving'}
                />
                <div className="checkbox-content">
                  <span className="setting-label">Enable Media Management</span>
                  <span className="setting-description">
                    Use the built-in media library for image and file uploads
                  </span>
                </div>
              </label>
            </div>
          </section>

          {/* API Information */}
          <section className="settings-section">
            <h2>API</h2>
            <div className="settings-group">
              <div className="setting-item">
                <span className="setting-label">Convex Deployment URL</span>
                <code className="setting-value">
                  {import.meta.env.VITE_CONVEX_URL || 'Not configured'}
                </code>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          {canEdit && (
            <section className="settings-section settings-section--danger">
              <h2>Danger Zone</h2>
              <div className="settings-group">
                <div className="setting-item setting-item--danger">
                  <div className="danger-content">
                    <span className="setting-label">Reset to Defaults</span>
                    <span className="setting-description">
                      Reset all settings to their default values. This cannot be undone.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleReset}
                    disabled={feedbackStatus === 'saving'}
                  >
                    Reset Settings
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
