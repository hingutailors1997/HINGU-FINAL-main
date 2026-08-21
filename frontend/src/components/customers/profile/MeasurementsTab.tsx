import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMeasurements, saveMeasurement, restoreMeasurementVersion } from '../../../lib/api';
import { generateCustomerMeasurementPDF } from '../../../lib/pdfExport';
import { useToast } from '../../../components/Toast';
import { GARMENT_REGISTRY, ANATOMICAL_PARAMETERS, getDefaultGarmentSpecs } from './measurements/garmentRegistry';
import { 
  Scissors, Save, Printer, RotateCcw, History, CheckCircle2, 
  Ruler, FileText, Calendar, Plus, Check, AlertCircle, RefreshCw,
  Mic, MicOff
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface Props {
  customerId: string;
  customerType?: string;
  customer?: any;
}

export default function MeasurementsTab({ customerId, customer }: Props) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeGarment, setActiveGarment] = useState('Shirt');
  const [unit, setUnit] = useState<'inch' | 'cm'>('inch');
  const [currentValues, setCurrentValues] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // --- Voice Input State ---
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'gu-IN' | 'en-US'>('gu-IN');
  const [interimText, setInterimText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
    };
  }, []);

  const handleVoiceResult = useCallback((finalText: string) => {
    setNotes(prev => {
      const updated = prev ? `${prev} ${finalText.trim()}` : finalText.trim();
      setCurrentValues(curr => ({ ...curr, _notes: updated }));
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      try { recognitionRef.current.stop(); } catch(e){}
      setIsListening(false);
      setInterimText('');
      return;
    }

    try {
      const recognition = recognitionRef.current;
      recognition.lang = voiceLang;
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          handleVoiceResult(finalTranscript);
        }
        setInterimText(interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          showToast('Microphone permission is required for voice input.', 'error');
        }
        setIsListening(false);
        setInterimText('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error('Failed to start speech recognition', e);
      setIsListening(false);
      setInterimText('');
    }
  };
  // -----------------------

  const garmentSpec = useMemo(() => GARMENT_REGISTRY[activeGarment] || GARMENT_REGISTRY['Custom'], [activeGarment]);
  const allowedIds = useMemo(() => {
    const baseIds = garmentSpec.requiredParameters || [];
    const customIds = Object.keys(currentValues).filter(k => k !== '_notes' && !baseIds.includes(k));
    return [...baseIds, ...customIds];
  }, [garmentSpec, currentValues]);

  const { data: measurementData, isLoading: isMeasLoading } = useQuery({
    queryKey: ['measurements', customerId],
    queryFn: () => fetchMeasurements(customerId),
    staleTime: 60000,
  });

  const activeList = useMemo(() => measurementData?.active || [], [measurementData]);
  const historyList = useMemo(() => measurementData?.history || [], [measurementData]);

  const currentGarmentData = useMemo(() => 
    activeList.find((m: any) => m.garmentType === activeGarment), 
  [activeList, activeGarment]);

  const garmentHistory = useMemo(() => 
    historyList.filter((m: any) => m.garmentType === activeGarment), 
  [historyList, activeGarment]);

  // Load appropriate values when changing garment or selecting historical record
  useEffect(() => {
    if (recognitionRef.current && isListening) {
      try { recognitionRef.current.stop(); } catch(e){}
      setIsListening(false);
      setInterimText('');
    }

    if (selectedVersionId) {
      const ver = garmentHistory.find((v: any) => v._id === selectedVersionId);
      if (ver && ver.measurements) {
        setCurrentValues(ver.measurements);
        setNotes(ver.notes || ver.measurements._notes || '');
        setHasUnsavedChanges(false);
        return;
      }
    }
    if (currentGarmentData && currentGarmentData.measurements && Object.keys(currentGarmentData.measurements).length > 0) {
      setCurrentValues(currentGarmentData.measurements);
      setNotes(currentGarmentData.notes || currentGarmentData.measurements._notes || '');
    } else {
      setCurrentValues(getDefaultGarmentSpecs(activeGarment));
      setNotes('');
    }
    setHasUnsavedChanges(false);
  }, [activeGarment, currentGarmentData, selectedVersionId, garmentHistory]);

  const handleValueChange = useCallback((key: string, val: any) => {
    setCurrentValues(prev => ({ ...prev, [key]: val }));
    setHasUnsavedChanges(true);
  }, []);

  const handleNotesChange = useCallback((val: string) => {
    setNotes(val);
    setCurrentValues(prev => ({ ...prev, _notes: val }));
    setHasUnsavedChanges(true);
  }, []);

  const getGarmentSpecificPayload = useCallback(() => {
    const cleanPayload: Record<string, any> = {};
    Object.entries(currentValues).forEach(([k, v]) => {
      const baseKey = k.replace('_notes', '');
      if (allowedIds.includes(baseKey) || k === '_notes') {
        cleanPayload[k] = v;
      }
    });
    if (notes) {
      cleanPayload._notes = notes;
    }
    return cleanPayload;
  }, [currentValues, allowedIds, notes]);

  const saveMutation = useMutation({
    mutationFn: () => saveMeasurement({
      customerId,
      garmentType: activeGarment,
      measurements: getGarmentSpecificPayload(),
      notes: notes,
      changeReason: selectedVersionId ? `New version derived from historical record` : `Enterprise workstation specification for ${activeGarment}`
    }),
    onSuccess: () => {
      if (recognitionRef.current && isListening) {
        try { recognitionRef.current.stop(); } catch(e){}
        setIsListening(false);
        setInterimText('');
      }
      showToast(`${activeGarment} measurements saved successfully!`, 'success');
      setHasUnsavedChanges(false);
      setSelectedVersionId(null);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
      queryClient.invalidateQueries({ queryKey: ['measurements', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customerMeasurements', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customerTimeline', customerId] });
    },
    onError: () => {
      showToast('Failed to save measurements to database.', 'error');
    }
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => restoreMeasurementVersion(versionId),
    onSuccess: () => {
      showToast('Historical specification restored as active version!', 'success');
      setSelectedVersionId(null);
      queryClient.invalidateQueries({ queryKey: ['measurements', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customerMeasurements', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customerTimeline', customerId] });
    },
    onError: () => {
      showToast('Failed to restore historical measurement record.', 'error');
    }
  });

  const handleResetToDefaults = () => {
    if (window.confirm(`Reset ${activeGarment} measurements to standard sample parameters?`)) {
      setCurrentValues(getDefaultGarmentSpecs(activeGarment));
      setNotes('');
      setHasUnsavedChanges(true);
      setSelectedVersionId(null);
    }
  };

  const availableGarments = [
    { name: 'Shirt', count: '17 points' },
    { name: 'Pant', count: '11 points' },
    { name: 'Kurta', count: '8 points' },
    { name: 'Sherwani', count: '11 points' },
    { name: 'Blazer', count: '10 points' },
    { name: 'Coat', count: '12 points' },
    { name: 'Waistcoat', count: '7 points' },
    { name: 'Safari', count: '10 points' },
    { name: 'Pathani', count: '10 points' },
    { name: 'Custom Garment', count: '23 points' }
  ];

  return (
    <div className="relative animate-in fade-in duration-300 w-full font-sans space-y-6 pb-12">
      
      {/* Save Success Banner */}
      {showConfetti && (
        <div className="fixed top-24 right-10 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-black text-sm animate-in slide-in-from-top duration-300 border border-emerald-500">
          <CheckCircle2 className="h-5 w-5 text-emerald-200 animate-pulse stroke-[2.5]" />
          <span>{activeGarment} measurements successfully saved to customer database!</span>
        </div>
      )}

      {/* ==================== 1. GARMENT SELECTOR BAR ==================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Scissors className="h-4 w-4 text-[#2563EB]" /> Select Garment Type
          </h2>
          <span className="text-xs font-bold text-slate-500">Click to switch measurement sheet</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {availableGarments.map((g) => {
            const typeKey = g.name;
            const isSelected = activeGarment === typeKey;
            const hasSavedData = activeList.some((m: any) => m.garmentType === typeKey && Object.keys(m.measurements || {}).length > 0);
            
            return (
              <button
                key={typeKey}
                onClick={() => {
                  setActiveGarment(typeKey);
                  setSelectedVersionId(null);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border",
                  isSelected
                    ? "bg-[#2563EB] text-white border-blue-600 shadow-md transform -translate-y-0.5"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                )}
              >
                <span>{g.name}</span>
                {hasSavedData && !isSelected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Saved specs available" />
                )}
                <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded", isSelected ? "bg-blue-700 text-blue-100" : "bg-slate-200 text-slate-600")}>
                  {g.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== 2. MAIN WORKSPACE (MEASUREMENTS + HISTORY) ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: SIMPLE MEASUREMENT INPUT SHEET (~75% Width on Desktop) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[20px] border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Sheet Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {activeGarment} Measurement Sheet
                  </h3>
                  {selectedVersionId ? (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold flex items-center gap-1">
                      <History className="h-3 w-3" /> Viewing Past Version
                    </span>
                  ) : currentGarmentData ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-600 stroke-[3]" /> Active Saved Specs
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#2563EB] border border-blue-200 text-xs font-extrabold">
                      New Entry
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  Enter exact measurements directly into the table below. All dimensions are recorded per garment category.
                </p>
              </div>

              {/* Controls: Unit Toggle & Reset */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    const customKey = window.prompt("Enter new measurement name (e.g., Height, Shoulder Angle):");
                    if (customKey && customKey.trim()) {
                      const key = customKey.trim().toLowerCase().replace(/\s+/g, '_');
                      handleValueChange(key, '');
                    }
                  }}
                  className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold px-3"
                  title="Add Custom Measurement"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Custom
                </button>
                <button
                  onClick={handleResetToDefaults}
                  title="Reset to Sample Defaults"
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold px-3"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>
            </div>

            {/* Measurement Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {allowedIds.map((id) => {
                const param = ANATOMICAL_PARAMETERS[id] || {
                  id,
                  label: id.charAt(0).toUpperCase() + id.slice(1),
                  hint: 'Standard tailoring measurement dimension',
                  defaultInches: 0
                };

                let displayVal = currentValues[id] ?? '';
                if (unit === 'cm' && displayVal !== '' && !isNaN(Number(displayVal))) {
                  displayVal = Math.round(Number(displayVal) * 2.54 * 10) / 10;
                }

                return (
                  <div key={id} className="relative group bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 transition-colors focus-within:border-[#2563EB] focus-within:bg-white focus-within:shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={`meas_${id}`} className="text-xs font-black text-slate-900 tracking-tight block truncate pr-6" title={param.label}>
                        {param.label}
                      </label>
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove ${param.label}?`)) {
                            setCurrentValues(prev => {
                              const next = { ...prev };
                              delete next[id];
                              return next;
                            });
                            setHasUnsavedChanges(true);
                          }
                        }}
                        className="absolute right-2 top-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove parameter"
                      >
                        &times;
                      </button>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-200/80 text-slate-600 rounded">
                        {unit}
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        id={`meas_${id}`}
                        type="number"
                        step="0.25"
                        value={displayVal}
                        onChange={(e) => {
                          const rawVal = e.target.value;
                          if (rawVal === '') {
                            handleValueChange(id, '');
                          } else {
                            const num = Number(rawVal);
                            const inchVal = unit === 'cm' ? Math.round((num / 2.54) * 100) / 100 : num;
                            handleValueChange(id, inchVal);
                          }
                        }}
                        placeholder={`e.g., ${param.defaultInches || 15}`}
                        className="w-full rounded-xl bg-white border border-slate-300 font-black text-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-slate-900 transition-all"
                      />
                    </div>

                    <p className="text-[11px] font-semibold text-slate-500 leading-snug line-clamp-2" title={param.hint}>
                      {param.hint}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Special Fitting Preferences & Remarks */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="master_notes" className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-[#2563EB]" /> Master Tailor Fitting Preferences & Custom Remarks
                </label>
                
                {speechSupported && (
                  <div className="flex items-center gap-2">
                    <select
                      value={voiceLang}
                      onChange={(e) => setVoiceLang(e.target.value as 'gu-IN' | 'en-US')}
                      className="text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2 py-1.5 focus:outline-none"
                      disabled={isListening}
                    >
                      <option value="gu-IN">ગુજરાતી</option>
                      <option value="en-US">English</option>
                    </select>
                    
                    <button
                      onClick={toggleListening}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all",
                        isListening 
                          ? "bg-rose-100 text-rose-700 border border-rose-200 animate-pulse" 
                          : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                      )}
                      title="Voice Input"
                      type="button"
                    >
                      {isListening ? (
                        <><MicOff className="h-3 w-3" /> Listening...</>
                      ) : (
                        <><Mic className="h-3 w-3" /> Voice</>
                      )}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="relative">
                <textarea
                  id="master_notes"
                  rows={3}
                  value={notes + (interimText ? (notes ? ' ' : '') + interimText : '')}
                  onChange={(e) => {
                    if (isListening) return; // Prevent manual typing collisions while actively speaking
                    handleNotesChange(e.target.value);
                  }}
                  placeholder="Enter any special tailoring notes, collar alterations, cuff allowances, or posture adaptations for this garment..."
                  className={cn(
                    "w-full rounded-xl border p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all",
                    isListening ? "border-blue-300 bg-blue-50/30 text-blue-900" : "border-slate-300 bg-slate-50/50 text-slate-800"
                  )}
                />
                {!speechSupported && (
                  <p className="text-[9px] text-slate-400 mt-1 font-semibold text-right">Voice input is not supported on this browser. Please use the keyboard.</p>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-200 gap-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
                {hasUnsavedChanges ? (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> Unsaved changes in this sheet
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> All dimensions synchronized
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    generateCustomerMeasurementPDF(
                      customer || { firstName: 'Customer', customerId: customerId },
                      [{ garmentType: activeGarment, measurements: currentValues, notes: notes }],
                      activeGarment
                    );
                  }}
                  className="flex-1 sm:flex-none h-11 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-slate-600" /> Download Spec PDF
                </button>

                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="flex-1 sm:flex-none h-11 px-8 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4 stroke-[2.5]" />
                  <span>{saveMutation.isPending ? 'Saving Spec...' : 'Save Measurement Specs'}</span>
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: MEASUREMENT VERSIONS & HISTORY (~25% Width on Desktop) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[20px] border border-slate-200 p-6 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <History className="h-5 w-5 text-[#2563EB]" /> Version Archives
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] font-black text-[11px]">
                {garmentHistory.length} Records
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              Every time you save measurements for <strong>{activeGarment}</strong>, a new timestamped version is archived here. You can review or restore past specifications anytime.
            </p>

            {isMeasLoading ? (
              <div className="py-8 text-center text-slate-400 font-bold text-xs animate-pulse">
                Loading
              </div>
            ) : garmentHistory.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
                <Ruler className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-black text-slate-700">No Historical Records</p>
                <p className="text-[11px] font-medium text-slate-500">
                  Enter dimensions in the sheet on the left and click <strong>Save Measurement Specs</strong> to generate Version 1.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {garmentHistory.map((record: any, idx: number) => {
                  const versionNum = garmentHistory.length - idx;
                  const isCurrentSelection = selectedVersionId === record._id;
                  const isLatestActive = !selectedVersionId && idx === 0 && currentGarmentData?._id === record._id;
                  const recordDate = new Date(record.updatedAt || record.createdAt || Date.now()).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  });

                  return (
                    <div
                      key={record._id}
                      onClick={() => setSelectedVersionId(record._id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2",
                        isCurrentSelection || isLatestActive
                          ? "bg-blue-50/80 border-[#2563EB] shadow-2xs"
                          : "bg-slate-50/70 border-slate-200 hover:border-blue-300 hover:bg-white"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-extrabold text-[#2563EB]">
                            v{record.versionNumber || versionNum}
                          </span>
                          <span>{record.garmentType || activeGarment}</span>
                        </span>

                        {isLatestActive ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase">
                            Active
                          </span>
                        ) : isCurrentSelection ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#2563EB] font-extrabold text-[10px] uppercase">
                            Selected
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">
                            Archived
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{recordDate}</span>
                        {record.notes && <span className="truncate text-slate-600">• {record.notes}</span>}
                      </div>

                      {isCurrentSelection && !isLatestActive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            restoreMutation.mutate(record._id);
                          }}
                          disabled={restoreMutation.isPending}
                          className="w-full mt-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3" /> Restore as Active Spec
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedVersionId && (
              <button
                onClick={() => setSelectedVersionId(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-black text-xs text-slate-700 transition-all cursor-pointer text-center block"
              >
                ← Return to Current Active Specs
              </button>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}

