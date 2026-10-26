import React, { useState, useEffect, useMemo } from 'react';
import { GSEEquipment } from '../../types/unifiedSheets';
import { extractGoogleDriveFileId, getIdentifiedEquipmentPhotos } from '../../services/unifiedSheetsService';
import { Camera, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface EquipmentPhotoProps {
  equipment: GSEEquipment;
  variant?: 'thumb' | 'tile' | 'card' | 'profile';
  className?: string;
}

function buildFallbackChain(rawUrl: string): string[] {
  if (!rawUrl) return [];
  const trimmed = rawUrl.trim();
  const driveId = extractGoogleDriveFileId(trimmed);

  if (driveId) {
    return [
      `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`,
      `https://lh3.googleusercontent.com/d/${driveId}=w1000`,
      `https://drive.google.com/uc?export=view&id=${driveId}`,
      trimmed,
    ];
  }
  return [trimmed];
}

export const EquipmentPhoto: React.FC<EquipmentPhotoProps> = ({
  equipment,
  variant = 'card',
  className = '',
}) => {
  const allCandidates = useMemo(() => {
    const sources: string[] = [];
    const identified = getIdentifiedEquipmentPhotos(equipment);
    // Prioritize photos explicitly identified as Unit Photo ("Pic for reference" / Overview unit photo)
    identified
      .filter((p) => p.category === 'unit')
      .forEach((p) => {
        if (p.displayUrl && !sources.includes(p.displayUrl)) {
          sources.push(p.displayUrl);
        }
      });

    if (equipment.mainPhotoUrl && !sources.includes(equipment.mainPhotoUrl)) {
      sources.push(equipment.mainPhotoUrl);
    }
    if (
      equipment.mainPhotoLink &&
      !equipment.mainPhotoLink.includes('/folders/') &&
      !sources.includes(equipment.mainPhotoLink)
    ) {
      sources.push(equipment.mainPhotoLink);
    }
    if (equipment.photoUrls && equipment.photoUrls.length > 0) {
      for (const u of equipment.photoUrls) {
        if (!sources.includes(u)) sources.push(u);
      }
    }

    const chain: string[] = [];
    for (const s of sources) {
      for (const candidate of buildFallbackChain(s)) {
        if (!chain.includes(candidate)) {
          chain.push(candidate);
        }
      }
    }
    return chain;
  }, [equipment]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [failedAll, setFailedAll] = useState(false);

  useEffect(() => {
    setCandidateIdx(0);
    setFailedAll(false);
  }, [equipment.equipmentNumber, allCandidates]);

  const currentSrc = !failedAll && allCandidates.length > 0 ? allCandidates[candidateIdx] : null;
  const externalLink = equipment.mainPhotoLink || equipment.mainPhotoUrl || '';

  const handleError = () => {
    if (candidateIdx + 1 < allCandidates.length) {
      setCandidateIdx(candidateIdx + 1);
    } else {
      setFailedAll(true);
    }
  };

  if (variant === 'thumb') {
    if (currentSrc) {
      return (
        <div className={`w-9 h-9 rounded-xs overflow-hidden bg-white border border-slate-200 dark:border-[#163854] shrink-0 flex items-center justify-center p-0.5 ${className}`}>
          <img
            src={currentSrc}
            alt={equipment.equipmentName}
            onError={handleError}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
        </div>
      );
    }
    return (
      <div className={`w-9 h-9 rounded-xs bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] shrink-0 flex items-center justify-center text-slate-400 dark:text-slate-500 ${className}`}>
        <ImageIcon className="w-4 h-4" />
      </div>
    );
  }

  // Executive business tile photo container for GSE Unit Overview
  if (variant === 'tile') {
    return (
      <div className={`relative w-full aspect-4/3 bg-white dark:bg-[#0A2236] flex items-center justify-center p-2.5 overflow-hidden border-b border-slate-100 dark:border-[#123E5E] ${className}`}>
        {currentSrc ? (
          <img
            src={currentSrc}
            alt={equipment.equipmentName}
            onError={handleError}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain group-hover:scale-103 transition-transform duration-200"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-1">
            <Camera className="w-6 h-6 stroke-[1.5]" />
            <span className="text-[10px] font-medium">No Photo</span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    if (currentSrc) {
      return (
        <div className={`relative w-full h-36 bg-white dark:bg-[#0A2236] overflow-hidden border-b border-slate-200 dark:border-[#123E5E] p-2 ${className}`}>
          <img
            src={currentSrc}
            alt={equipment.equipmentName}
            onError={handleError}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain group-hover:scale-103 transition-transform duration-200"
          />
          {externalLink && (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Open full unit photo"
              className="absolute bottom-2 right-2 bg-[#063452]/85 hover:bg-[#F37022] text-white p-1.5 rounded-xs shadow-2xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      );
    }

    return (
      <div className={`relative w-full h-36 bg-slate-50 dark:bg-[#0A2236] border-b border-slate-200 dark:border-[#123E5E] flex flex-col items-center justify-center gap-1.5 text-slate-400 ${className}`}>
        <Camera className="w-5 h-5" />
        {externalLink ? (
          <a
            href={externalLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#F37022] hover:underline"
          >
            <span>Open Unit Photo</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-[11px]">No unit photo</span>
        )}
      </div>
    );
  }

  // Profile modal variant
  return (
    <div className={`rounded-md overflow-hidden border border-slate-200 dark:border-[#163854] bg-white dark:bg-[#0A2236] ${className}`}>
      {currentSrc ? (
        <div className="relative">
          <div className="p-4 flex items-center justify-center bg-white dark:bg-[#0A2236] min-h-48 max-h-64">
            <img
              src={currentSrc}
              alt={equipment.equipmentName}
              onError={handleError}
              referrerPolicy="no-referrer"
              className="max-h-56 w-auto object-contain"
            />
          </div>
          {externalLink && (
            <div className="px-3 py-2 bg-slate-50 dark:bg-[#041B2D] border-t border-slate-200 dark:border-[#163854] flex items-center justify-between text-xs">
              <span className="font-medium text-[#063452] dark:text-[#F0F7F8] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#F37022]" />
                {equipment.equipmentNumber}
              </span>
              <a
                href={externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#F37022] hover:underline"
              >
                <span>Original</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      ) : externalLink ? (
        <div className="p-4 flex items-center justify-between bg-slate-50 dark:bg-[#041B2D]">
          <div className="flex items-center gap-2 text-[#063452] dark:text-[#F0F7F8]">
            <Camera className="w-4 h-4 text-[#F37022]" />
            <span className="font-medium text-xs">Unit Photo Link</span>
          </div>
          <a
            href={externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-[#063452] hover:bg-[#09476e] text-white font-medium text-xs transition-colors"
          >
            <span>Open Photo</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : (
        <div className="p-6 flex flex-col items-center justify-center gap-1.5 text-slate-400 bg-slate-50/50 dark:bg-[#0A2236]">
          <Camera className="w-6 h-6 stroke-[1.5]" />
          <span className="text-xs">No photo linked for {equipment.equipmentNumber}</span>
        </div>
      )}
    </div>
  );
};

interface SinglePhotoViewerProps {
  url: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}

export const SinglePhotoViewer: React.FC<SinglePhotoViewerProps> = ({
  url,
  alt,
  className = '',
  imgClassName = 'w-full h-full object-contain',
}) => {
  const candidates = useMemo(() => buildFallbackChain(url), [url]);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [url]);

  const currentSrc = !failed && candidates.length > 0 ? candidates[idx] : null;

  const handleError = () => {
    if (idx + 1 < candidates.length) {
      setIdx(idx + 1);
    } else {
      setFailed(true);
    }
  };

  if (!currentSrc) {
    return (
      <div className={`flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-1 p-3 ${className}`}>
        <Camera className="w-5 h-5 stroke-[1.5]" />
        <span className="text-[10px]">Preview unavailable</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center overflow-hidden ${className}`}>
      <img
        src={currentSrc}
        alt={alt}
        onError={handleError}
        referrerPolicy="no-referrer"
        className={imgClassName}
      />
    </div>
  );
};

