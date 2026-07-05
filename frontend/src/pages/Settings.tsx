import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Save, Volume2, Music, Bell, Moon, Sun, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { useGameStore } from '../lib/store';
import { playerApi } from '../lib/api';

interface PlayerSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  soundEnabled: boolean;
  musicEnabled: boolean;
  autoSave: boolean;
  notifications: boolean;
  theme: 'dark' | 'light';
}

export default function Settings() {
  const navigate = useNavigate();
  const { player, setPlayer } = useGameStore();
  const [settings, setSettings] = useState<PlayerSettings>(player?.settings || {
    difficulty: 'medium',
    soundEnabled: true,
    musicEnabled: true,
    autoSave: true,
    notifications: true,
    theme: 'dark',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!player) return;

    setIsSaving(true);
    try {
      await playerApi.update(player.id, {
        settings,
      });
      setPlayer({ ...player, settings });
      alert('Settings saved!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSetting = (key: keyof PlayerSettings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings({ ...settings, [key]: !settings[key] as boolean });
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="glass-button p-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold gradient-text">Settings</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="glass-button flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Settings */}
        <div className="space-y-6">
          {/* Difficulty */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4">Game Difficulty</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['easy', 'medium', 'hard', 'expert'].map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => setSettings({ ...settings, difficulty: difficulty as any })}
                  className={cn(
                    'glass-button capitalize',
                    settings.difficulty === difficulty && 'bg-primary/20 border-primary'
                  )}
                >
                  {difficulty}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Settings */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4">Audio</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5" />
                  <span>Sound Effects</span>
                </div>
                <button
                  onClick={() => toggleSetting('soundEnabled')}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors',
                    settings.soundEnabled ? 'bg-primary' : 'bg-surfaceLight'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5" />
                  <span>Background Music</span>
                </div>
                <button
                  onClick={() => toggleSetting('musicEnabled')}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors',
                    settings.musicEnabled ? 'bg-primary' : 'bg-surfaceLight'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settings.musicEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Game Settings */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4">Game Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Save className="w-5 h-5" />
                  <span>Auto-Save</span>
                </div>
                <button
                  onClick={() => toggleSetting('autoSave')}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors',
                    settings.autoSave ? 'bg-primary' : 'bg-surfaceLight'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settings.autoSave ? 'translate-x-6' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5" />
                  <span>Notifications</span>
                </div>
                <button
                  onClick={() => toggleSetting('notifications')}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors',
                    settings.notifications ? 'bg-primary' : 'bg-surfaceLight'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settings.notifications ? 'translate-x-6' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Theme */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4">Theme</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setSettings({ ...settings, theme: 'dark' })}
                className={cn(
                  'glass-button flex-1 flex items-center justify-center gap-2',
                  settings.theme === 'dark' && 'bg-primary/20 border-primary'
                )}
              >
                <Moon className="w-5 h-5" />
                Dark
              </button>
              <button
                onClick={() => setSettings({ ...settings, theme: 'light' })}
                className={cn(
                  'glass-button flex-1 flex items-center justify-center gap-2',
                  settings.theme === 'light' && 'bg-primary/20 border-primary'
                )}
              >
                <Sun className="w-5 h-5" />
                Light
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
