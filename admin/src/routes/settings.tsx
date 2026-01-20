import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="page settings-page">
      <header className="page-header">
        <h1>Settings</h1>
        <p className="page-description">
          Configure your CMS settings and preferences.
        </p>
      </header>

      <div className="settings-sections">
        <section className="settings-section">
          <h2>General</h2>
          <div className="settings-group">
            <label className="setting-item">
              <span className="setting-label">Default Locale</span>
              <select className="setting-input" defaultValue="en">
                <option value="en">English (en)</option>
                <option value="es">Spanish (es)</option>
                <option value="fr">French (fr)</option>
                <option value="de">German (de)</option>
              </select>
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2>Features</h2>
          <div className="settings-group">
            <label className="setting-item checkbox">
              <input type="checkbox" defaultChecked />
              <span className="setting-label">Enable Versioning</span>
              <span className="setting-description">Track content history and enable rollback</span>
            </label>
            <label className="setting-item checkbox">
              <input type="checkbox" defaultChecked />
              <span className="setting-label">Enable Scheduling</span>
              <span className="setting-description">Schedule content to publish at a future date</span>
            </label>
            <label className="setting-item checkbox">
              <input type="checkbox" />
              <span className="setting-label">Enable Localization</span>
              <span className="setting-description">Support multiple languages for content</span>
            </label>
            <label className="setting-item checkbox">
              <input type="checkbox" defaultChecked />
              <span className="setting-label">Enable Media Management</span>
              <span className="setting-description">Use the built-in media library</span>
            </label>
          </div>
        </section>

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
      </div>
    </div>
  )
}
