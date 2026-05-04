import { useState } from 'react';
import type { ClassGuide } from '../data/guides/types';
import { CLASS_COLORS } from '../types';
import type { WowClass } from '../types';
import { TalentBuildSection } from './guides/TalentBuildSection';
import { StatPrioritySection } from './guides/StatPrioritySection';
import { ConsumablesSection } from './guides/ConsumablesSection';
import { EnchantsSection } from './guides/EnchantsSection';

const GUIDE_SECTIONS = ['Talent Builds', 'Stat Priority', 'Consumables', 'Enchants & Gems'] as const;
type GuideSection = (typeof GUIDE_SECTIONS)[number];

interface Props {
  guide: ClassGuide;
  onBack: () => void;
}

export function ClassGuideView({ guide, onBack }: Props) {
  const [activeSpec, setActiveSpec] = useState(0);
  const [activeSection, setActiveSection] = useState<GuideSection>('Talent Builds');

  const classColor = CLASS_COLORS[guide.wowClass as WowClass] ?? '#ffffff';
  const spec = guide.specs[activeSpec];

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Class Guides
        </button>
        <span className="text-gray-600">/</span>
        <span className="font-bold text-lg" style={{ color: classColor }}>
          {guide.className}
        </span>
      </div>

      {/* Spec tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-700 pb-0">
        {guide.specs.map((s, i) => (
          <button
            key={s.specName}
            onClick={() => setActiveSpec(i)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors -mb-px border-b-2 ${
              activeSpec === i
                ? 'border-amber-500 text-white bg-gray-800'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {s.specName}
          </button>
        ))}
      </div>

      {/* Spec meta + source links */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="text-xs text-gray-500">
          {spec.season} · Patch {spec.patch}
          {spec.lastUpdated && (
            <span> · Updated {spec.lastUpdated}</span>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          {spec.links.rotation && (
            <a
              href={spec.links.rotation}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Rotation Guide ↗
            </a>
          )}
          {spec.links.cheatSheet && (
            <a
              href={spec.links.cheatSheet}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Cheat Sheet ↗
            </a>
          )}
          {spec.links.bisGear && (
            <a
              href={spec.links.bisGear}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              BiS Gear ↗
            </a>
          )}
        </div>
      </div>

      {/* Section sub-tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {GUIDE_SECTIONS.map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              activeSection === section
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div>
        {activeSection === 'Talent Builds' && (
          <TalentBuildSection loadouts={spec.talentLoadouts} />
        )}
        {activeSection === 'Stat Priority' && (
          <StatPrioritySection stats={spec.statPriority} />
        )}
        {activeSection === 'Consumables' && (
          <ConsumablesSection consumables={spec.consumables} />
        )}
        {activeSection === 'Enchants & Gems' && (
          <EnchantsSection enchants={spec.enchants} gems={spec.gems} />
        )}
      </div>
    </div>
  );
}
