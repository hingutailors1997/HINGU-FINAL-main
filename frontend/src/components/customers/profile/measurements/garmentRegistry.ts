// Enterprise Bespoke Tailoring Domain Registry (Raymond / Manyavar Grade Architecture)
// Single source of truth for all anatomical parameter definitions, garment mappings, and validation tolerances.

export interface AnatomicalParameter {
  id: string;
  label: string;
  category: 'Upper Body' | 'Lower Body' | 'Arm & Sleeve' | 'Postural & Lengths' | 'Bespoke Details';
  hint: string;
  defaultInches: number;
  minInches: number;
  maxInches: number;
  viewAngle: 'front' | 'left' | 'back' | 'right'; // Primary anatomical viewing aspect
  stepInstruction: string;
}

export interface GarmentSpecification {
  garmentType: string;
  displayName: string;
  category: string;
  requiredParameters: string[]; // Strict parameter isolation order (one by one step sequence)
  estimatedFabricMeters: number;
  allowComparison: boolean;
}

// Complete anatomical parameter registry across all formalwear and bespoke categories
export const ANATOMICAL_PARAMETERS: Record<string, AnatomicalParameter> = {
  // --- Upper Body & Collar ---
  neck: {
    id: 'neck',
    label: 'Neck Circumference',
    category: 'Upper Body',
    hint: 'Measure around base of neck where shirt collar rests, inserting two fingers for breathing comfort ease.',
    defaultInches: 15.5,
    minInches: 10,
    maxInches: 24,
    viewAngle: 'front',
    stepInstruction: 'Position measuring tape snugly around lower neck line above clavicle without restricting throat.'
  },
  collar: {
    id: 'collar',
    label: 'Collar Band Length',
    category: 'Upper Body',
    hint: 'Exact button-to-button center measurement along collar band.',
    defaultInches: 16.0,
    minInches: 11,
    maxInches: 25,
    viewAngle: 'front',
    stepInstruction: 'Measure along finished collar band from center of buttonhole to center of button.'
  },
  collarHeight: {
    id: 'collarHeight',
    label: 'Collar Stand Height',
    category: 'Bespoke Details',
    hint: 'Vertical height of Nehru/Mandarin collar stand for Sherwani or Bandhgalas.',
    defaultInches: 1.75,
    minInches: 1.0,
    maxInches: 3.5,
    viewAngle: 'front',
    stepInstruction: 'Measure vertically from lower collar seam to desired upper edge of rigid Nehru collar.'
  },
  shoulder: {
    id: 'shoulder',
    label: 'Shoulder Width (Across Back)',
    category: 'Upper Body',
    hint: 'Measure across back from outer left shoulder tip (acromion bone) to right shoulder tip.',
    defaultInches: 17.5,
    minInches: 12,
    maxInches: 26,
    viewAngle: 'back',
    stepInstruction: 'Stand behind client; run measuring tape across prominence of shoulder blade spine from bone tip to bone tip.'
  },
  shoulderSlope: {
    id: 'shoulderSlope',
    label: 'Shoulder Slope Drop',
    category: 'Postural & Lengths',
    hint: 'Vertical drop difference from lateral neck base to outer shoulder bone tip.',
    defaultInches: 1.5,
    minInches: 0.5,
    maxInches: 3.5,
    viewAngle: 'front',
    stepInstruction: 'Assess shoulder angle decline; typical square shoulder is 1.0 inch, sloped shoulder is 2.0+ inches.'
  },
  chest: {
    id: 'chest',
    label: 'Chest Girth (Fullest Part)',
    category: 'Upper Body',
    hint: 'Measure horizontally around fullest prominence of chest across shoulder blades under armpits.',
    defaultInches: 38.0,
    minInches: 22,
    maxInches: 64,
    viewAngle: 'front',
    stepInstruction: 'Keep measuring tape strictly horizontal; ensure client stands naturally with arms relaxed at sides.'
  },
  upperChest: {
    id: 'upperChest',
    label: 'Upper Chest (Under Armpits)',
    category: 'Upper Body',
    hint: 'Horizontal perimeter taken high under armpits directly above pectorals.',
    defaultInches: 37.0,
    minInches: 21,
    maxInches: 62,
    viewAngle: 'front',
    stepInstruction: 'Position tape as high under armpits as possible across back shoulder blades and upper frontal thorax.'
  },
  acrossChest: {
    id: 'acrossChest',
    label: 'Across Chest (Front Width)',
    category: 'Upper Body',
    hint: 'Horizontal frontal span between anterior armpit crease seams.',
    defaultInches: 15.5,
    minInches: 10,
    maxInches: 24,
    viewAngle: 'front',
    stepInstruction: 'Measure straight across upper front chest between left and right sleeve seam insertion points.'
  },
  backWidth: {
    id: 'backWidth',
    label: 'Across Back Width',
    category: 'Upper Body',
    hint: 'Horizontal span across shoulder blades between posterior armpit creases.',
    defaultInches: 16.5,
    minInches: 11,
    maxInches: 26,
    viewAngle: 'back',
    stepInstruction: 'Measure horizontal back span between back armhole curves across middle of shoulder blades.'
  },
  yoke: {
    id: 'yoke',
    label: 'Back Yoke Width',
    category: 'Upper Body',
    hint: 'Horizontal width across upper back shirt yoke seam.',
    defaultInches: 17.5,
    minInches: 12,
    maxInches: 27,
    viewAngle: 'back',
    stepInstruction: 'Measure across top of back shoulder line where split yoke seam sits.'
  },
  waist: {
    id: 'waist',
    label: 'Natural Waist / Stomach Girth',
    category: 'Upper Body',
    hint: 'Measure around navel or fullest abdominal prominence for upper garment tailoring.',
    defaultInches: 34.0,
    minInches: 20,
    maxInches: 62,
    viewAngle: 'front',
    stepInstruction: 'Locate natural waistline at navel level; ensure tape is level and fit accommodates normal sitting respiration.'
  },
  stomach: {
    id: 'stomach',
    label: 'Stomach',
    category: 'Upper Body',
    hint: 'Measure around fullest abdominal circumference.',
    defaultInches: 34.0,
    minInches: 20,
    maxInches: 62,
    viewAngle: 'front',
    stepInstruction: 'Locate natural waistline at navel level; ensure tape is level.'
  },
  length: {
    id: 'length',
    label: 'Length',
    category: 'Postural & Lengths',
    hint: 'Measure from collar seam down front/back to desired bottom hem.',
    defaultInches: 28.5,
    minInches: 18,
    maxInches: 42,
    viewAngle: 'front',
    stepInstruction: 'Measure vertically from neck base seam straight down to lower hip tail break.'
  },
  sleeves: {
    id: 'sleeves',
    label: 'Sleeves',
    category: 'Arm & Sleeve',
    hint: 'Measure from outer shoulder tip down arm to wrist bone.',
    defaultInches: 25.5,
    minInches: 15,
    maxInches: 36,
    viewAngle: 'left',
    stepInstruction: 'Run tape along outer arm curve down to desired cuff finished margin.'
  },
  front1: {
    id: 'front1',
    label: 'Front 1',
    category: 'Upper Body',
    hint: 'First front measurement.',
    defaultInches: 15.0,
    minInches: 5,
    maxInches: 30,
    viewAngle: 'front',
    stepInstruction: 'Take the first specific front measurement.'
  },
  front2: {
    id: 'front2',
    label: 'Front 2',
    category: 'Upper Body',
    hint: 'Second front measurement.',
    defaultInches: 16.0,
    minInches: 5,
    maxInches: 30,
    viewAngle: 'front',
    stepInstruction: 'Take the second specific front measurement.'
  },
  front3: {
    id: 'front3',
    label: 'Front 3',
    category: 'Upper Body',
    hint: 'Third front measurement.',
    defaultInches: 17.0,
    minInches: 5,
    maxInches: 30,
    viewAngle: 'front',
    stepInstruction: 'Take the third specific front measurement.'
  },
  mundho: {
    id: 'mundho',
    label: 'Mundho (Sleeves Looseness)',
    category: 'Arm & Sleeve',
    hint: 'Sleeves nu loose ketlu karvu che (Sleeve looseness)',
    defaultInches: 18.0,
    minInches: 10,
    maxInches: 30,
    viewAngle: 'left',
    stepInstruction: 'Determine how loose the sleeves should be.'
  },

  // --- Arm & Sleeve Parameters ---
  sleeve: {
    id: 'sleeve',
    label: 'Sleeve Full Length',
    category: 'Arm & Sleeve',
    hint: 'Measure from outer shoulder tip down relaxed arm to wrist bone or base of thumb.',
    defaultInches: 25.5,
    minInches: 15,
    maxInches: 36,
    viewAngle: 'left',
    stepInstruction: 'With elbow slightly bent at 15 degrees, measure from shoulder seam down outer arm to desired wrist break.'
  },
  sleeveLength: {
    id: 'sleeveLength',
    label: 'Sleeve Length',
    category: 'Arm & Sleeve',
    hint: 'Measure from outer shoulder tip down relaxed arm to wrist bone.',
    defaultInches: 25.5,
    minInches: 15,
    maxInches: 36,
    viewAngle: 'left',
    stepInstruction: 'Run tape along outer arm curve down to desired cuff finished margin.'
  },
  armhole: {
    id: 'armhole',
    label: 'Armhole Circumference (Scye)',
    category: 'Arm & Sleeve',
    hint: 'Circular perimeter passing vertically over shoulder tip and under armpit crease.',
    defaultInches: 19.0,
    minInches: 12,
    maxInches: 30,
    viewAngle: 'left',
    stepInstruction: 'Wrap tape vertically around arm shoulder joint insertion; maintain two finger comfort tolerance.'
  },
  bicep: {
    id: 'bicep',
    label: 'Bicep Girth',
    category: 'Arm & Sleeve',
    hint: 'Measure around widest muscular circumference of upper arm.',
    defaultInches: 13.5,
    minInches: 8,
    maxInches: 24,
    viewAngle: 'left',
    stepInstruction: 'Wrap measuring tape around fullest bicep prominence parallel to floor with arm flexed slightly.'
  },
  forearm: {
    id: 'forearm',
    label: 'Forearm Girth',
    category: 'Arm & Sleeve',
    hint: 'Measure around thickest circumference of lower arm below elbow joint.',
    defaultInches: 11.0,
    minInches: 7,
    maxInches: 20,
    viewAngle: 'left',
    stepInstruction: 'Position measuring tape around widest part of forearm below elbow crease.'
  },
  wrist: {
    id: 'wrist',
    label: 'Wrist Bone Circumference',
    category: 'Arm & Sleeve',
    hint: 'Snug anatomical perimeter around styloid process wrist bones.',
    defaultInches: 7.25,
    minInches: 5,
    maxInches: 13,
    viewAngle: 'left',
    stepInstruction: 'Measure snugly around anatomical wrist bone joints without ease addition.'
  },
  cuff: {
    id: 'cuff',
    label: 'Finished Cuff Opening',
    category: 'Arm & Sleeve',
    hint: 'Target finished buttoned circumference of shirt or jacket cuff including watch clearance.',
    defaultInches: 9.0,
    minInches: 6,
    maxInches: 15,
    viewAngle: 'left',
    stepInstruction: 'Determine finished garment cuff opening; factor in wristwatch thickness on preferred hand.'
  },

  // --- Garment & Body Lengths ---
  shirtLength: {
    id: 'shirtLength',
    label: 'Shirt Full Length',
    category: 'Postural & Lengths',
    hint: 'Measure from lateral collar base down back or front to bottom tail hem.',
    defaultInches: 28.5,
    minInches: 18,
    maxInches: 42,
    viewAngle: 'front',
    stepInstruction: 'Measure vertically from neck base seam straight down to lower hip tail break.'
  },
  backLength: {
    id: 'backLength',
    label: 'Center Back Length',
    category: 'Postural & Lengths',
    hint: 'Vertical measurement along center back spine from base of collar seam to lower hem.',
    defaultInches: 29.5,
    minInches: 18,
    maxInches: 52,
    viewAngle: 'back',
    stepInstruction: 'Run tape from lower collar attachment point straight down along spinal midline to bottom jacket/kurta hem.'
  },
  frontLength: {
    id: 'frontLength',
    label: 'Center Front Length',
    category: 'Postural & Lengths',
    hint: 'Vertical length from front throat collar insertion down to bottom front placket hem.',
    defaultInches: 40.0,
    minInches: 20,
    maxInches: 54,
    viewAngle: 'front',
    stepInstruction: 'Measure straight down front midline from lower neck band to knee/calf target finish.'
  },
  blazerLength: {
    id: 'blazerLength',
    label: 'Blazer / Jacket Finished Length',
    category: 'Postural & Lengths',
    hint: 'Measure from collar seam straight down to tip of thumb knuckle with arms relaxed.',
    defaultInches: 30.0,
    minInches: 20,
    maxInches: 44,
    viewAngle: 'back',
    stepInstruction: 'Ensure jacket length properly covers buttocks curvature and balances leg silhouette ratio.'
  },
  kurtaLength: {
    id: 'kurtaLength',
    label: 'Kurta Full Length',
    category: 'Postural & Lengths',
    hint: 'Measure from lateral neck base down torso past knee to desired traditional drop.',
    defaultInches: 42.0,
    minInches: 26,
    maxInches: 54,
    viewAngle: 'front',
    stepInstruction: 'Measure vertically down front to approximately 2 inches below patella knee joint.'
  },
  sherwaniLength: {
    id: 'sherwaniLength',
    label: 'Sherwani Full Length',
    category: 'Postural & Lengths',
    hint: 'Regal formal length measured from Nehru collar base down to lower shin/calf.',
    defaultInches: 44.0,
    minInches: 30,
    maxInches: 56,
    viewAngle: 'front',
    stepInstruction: 'Measure straight down front silhouette to desired ceremonial drape height above ankles.'
  },
  vent: {
    id: 'vent',
    label: 'Jacket Vent Height',
    category: 'Bespoke Details',
    hint: 'Vertical opening height for side double vents or center back split vent.',
    defaultInches: 9.5,
    minInches: 5,
    maxInches: 18,
    viewAngle: 'back',
    stepInstruction: 'Measure from bottom back hem upward to top bar-tack closure of side or center vent.'
  },
  lapel: {
    id: 'lapel',
    label: 'Lapel Notch / Peak Width',
    category: 'Bespoke Details',
    hint: 'Width of jacket lapel across widest perpendicular axis of notch or peak.',
    defaultInches: 3.25,
    minInches: 1.5,
    maxInches: 6.0,
    viewAngle: 'front',
    stepInstruction: 'Measure at widest notch point of lapel collar roll across frontal lapel wing.'
  },

  // --- Lower Body & Trouser Parameters ---
  waist_pant: {
    id: 'waist_pant',
    label: 'Waist',
    category: 'Lower Body',
    hint: 'Measure around the pant waistline.',
    defaultInches: 33.0,
    minInches: 20,
    maxInches: 60,
    viewAngle: 'front',
    stepInstruction: 'Measure exact waistband position above hip bones; keep tape taut without compressing skin.'
  },
  hip: {
    id: 'hip',
    label: 'Hip Circumference',
    category: 'Lower Body',
    hint: 'Measure horizontally around upper hip articulation below waistband.',
    defaultInches: 39.0,
    minInches: 24,
    maxInches: 66,
    viewAngle: 'left',
    stepInstruction: 'Wrap tape horizontally around upper pelvic circumference mid-way between waist and widest seat.'
  },
  seat: {
    id: 'seat',
    label: 'Seat',
    category: 'Lower Body',
    hint: 'Measure horizontally around maximum posterior protrusion of buttocks with feet together.',
    defaultInches: 40.5,
    minInches: 26,
    maxInches: 68,
    viewAngle: 'left',
    stepInstruction: 'Instruct client to keep heels touching; measure around maximum backward projection of seat.'
  },
  rise: {
    id: 'rise',
    label: 'Crotch Rise / U-Rise',
    category: 'Lower Body',
    hint: 'Measure continuously from top front waistband down under crotch to top center back waistband.',
    defaultInches: 25.5,
    minInches: 16,
    maxInches: 42,
    viewAngle: 'left',
    stepInstruction: 'Run measuring tape from front belt line under crotch curve up to rear center waistband.'
  },
  thighs: {
    id: 'thighs',
    label: 'Thighs (jaang)',
    category: 'Lower Body',
    hint: 'Measure around uppermost thickest circumference of thigh immediately below crotch fork.',
    defaultInches: 23.5,
    minInches: 14,
    maxInches: 40,
    viewAngle: 'left',
    stepInstruction: 'Wrap tape around upper leg level with crotch fork intersection; leave one finger comfort allowance.'
  },
  knee: {
    id: 'knee',
    label: 'Knee',
    category: 'Lower Body',
    hint: 'Measure around mid-patella knee joint with leg straight.',
    defaultInches: 16.0,
    minInches: 10,
    maxInches: 28,
    viewAngle: 'front',
    stepInstruction: 'Measure circumference directly across center patella knee cap bone.'
  },
  calf: {
    id: 'calf',
    label: 'Calf Girth (Fullest Muscle)',
    category: 'Lower Body',
    hint: 'Measure around thickest protrusion of posterior lower leg calf muscle.',
    defaultInches: 15.0,
    minInches: 9,
    maxInches: 26,
    viewAngle: 'left',
    stepInstruction: 'Position tape horizontally around widest prominence of gastroc calf muscle below knee.'
  },
  bottom: {
    id: 'bottom',
    label: 'Bottom',
    category: 'Lower Body',
    hint: 'Desired circular opening perimeter of lower trouser cuff hem.',
    defaultInches: 14.5,
    minInches: 10,
    maxInches: 26,
    viewAngle: 'front',
    stepInstruction: 'Determine bottom trouser break opening width; standard tapered formal trouser is 14 to 15 inches.'
  },
  langot: {
    id: 'langot',
    label: 'Langot (from middle to back ) stitches',
    category: 'Lower Body',
    hint: 'Measure continuously from top front waistband down under crotch to top center back waistband.',
    defaultInches: 25.5,
    minInches: 16,
    maxInches: 42,
    viewAngle: 'left',
    stepInstruction: 'Run measuring tape from front belt line under crotch curve up to rear center waistband.'
  },
  inseam: {
    id: 'inseam',
    label: 'Inseam Length (Inside Leg)',
    category: 'Lower Body',
    hint: 'Measure along inside leg seam from crotch fork straight down to inner ankle hem.',
    defaultInches: 31.0,
    minInches: 20,
    maxInches: 42,
    viewAngle: 'front',
    stepInstruction: 'Run tape straight down inside leg from crotch junction seam to lower shoetop break.'
  },
  outseam: {
    id: 'outseam',
    label: 'Outseam Length (Outside Leg)',
    category: 'Lower Body',
    hint: 'Measure from upper waistband edge along lateral outside leg down to floor or heel break.',
    defaultInches: 41.5,
    minInches: 26,
    maxInches: 52,
    viewAngle: 'left',
    stepInstruction: 'Measure along outer trouser side seam from waistband top down to heel sole margin.'
  },
  length_pant: {
    id: 'length_pant',
    label: 'Length',
    category: 'Lower Body',
    hint: 'Target overall vertical length from waistband top to front shoe break.',
    defaultInches: 41.0,
    minInches: 26,
    maxInches: 52,
    viewAngle: 'front',
    stepInstruction: 'Verify final garment vertical drop to assure appropriate single or slight quarter shoe break.'
  },
};

// Explicit Garment Domain Logic Specifications
export const GARMENT_REGISTRY: Record<string, GarmentSpecification> = {
  Shirt: {
    garmentType: 'Shirt',
    displayName: 'Bespoke Formal Shirt',
    category: 'Upper Body',
    requiredParameters: [
      'length', 'shoulder', 'sleeves', 'chest', 'stomach', 'seat', 'front1', 'front2', 'front3', 'mundho'
    ],
    estimatedFabricMeters: 2.15,
    allowComparison: true
  },
  Pant: {
    garmentType: 'Pant',
    displayName: 'Bespoke Trouser Pant',
    category: 'Lower Body',
    requiredParameters: [
      'length_pant', 'waist_pant', 'seat', 'thighs', 'knee', 'bottom', 'langot'
    ],
    estimatedFabricMeters: 1.30,
    allowComparison: true
  },
  Kurta: {
    garmentType: 'Kurta',
    displayName: 'Traditional Ceremonial Kurta',
    category: 'Ethnic & Royal',
    requiredParameters: [
      'neck', 'chest', 'waist', 'hip', 'sleeveLength', 'kurtaLength', 'shoulder', 'armhole'
    ],
    estimatedFabricMeters: 2.80,
    allowComparison: true
  },
  Blazer: {
    garmentType: 'Blazer',
    displayName: 'Single / Double Breasted Blazer',
    category: 'Formalwear',
    requiredParameters: [
      'neck', 'shoulder', 'chest', 'waist', 'sleeveLength', 'blazerLength', 
      'backLength', 'vent', 'lapel', 'armhole'
    ],
    estimatedFabricMeters: 2.40,
    allowComparison: true
  },
  Sherwani: {
    garmentType: 'Sherwani',
    displayName: 'Royal Wedding Sherwani',
    category: 'Ethnic & Royal',
    requiredParameters: [
      'neck', 'chest', 'waist', 'hip', 'sleeveLength', 'sherwaniLength', 
      'collarHeight', 'frontLength', 'backLength', 'armhole', 'seat'
    ],
    estimatedFabricMeters: 3.85,
    allowComparison: true
  },
  Coat: {
    garmentType: 'Coat',
    displayName: 'Formal Evening Coat',
    category: 'Formalwear',
    requiredParameters: [
      'neck', 'shoulder', 'chest', 'waist', 'sleeveLength', 'blazerLength', 
      'backLength', 'vent', 'armhole', 'backWidth', 'upperChest', 'acrossChest'
    ],
    estimatedFabricMeters: 3.10,
    allowComparison: true
  },
  Suit: {
    garmentType: 'Suit',
    displayName: '2-Piece Bespoke Formal Suit',
    category: 'Formalwear',
    requiredParameters: [
      'neck', 'shoulder', 'chest', 'waist', 'sleeveLength', 'blazerLength', 'backLength',
      'waist_pant', 'hip', 'seat', 'rise', 'thigh', 'knee', 'bottom', 'pantLength'
    ],
    estimatedFabricMeters: 4.25,
    allowComparison: true
  },
  Waistcoat: {
    garmentType: 'Waistcoat',
    displayName: 'Tailored Waistcoat / Vest',
    category: 'Formalwear',
    requiredParameters: [
      'neck', 'shoulder', 'chest', 'waist', 'acrossChest', 'blazerLength', 'armhole'
    ],
    estimatedFabricMeters: 1.10,
    allowComparison: true
  },
  Jacket: {
    garmentType: 'Jacket',
    displayName: 'Casual Tailored Jacket',
    category: 'Outerwear',
    requiredParameters: [
      'neck', 'shoulder', 'chest', 'waist', 'sleeveLength', 'blazerLength', 'armhole', 'backWidth'
    ],
    estimatedFabricMeters: 2.50,
    allowComparison: true
  },
  'T-Shirt': {
    garmentType: 'T-Shirt',
    displayName: 'Bespoke Knit T-Shirt',
    category: 'Casualwear',
    requiredParameters: [
      'neck', 'shoulder', 'chest', 'waist', 'sleeveLength', 'bicep', 'shirtLength', 'armhole'
    ],
    estimatedFabricMeters: 1.50,
    allowComparison: true
  },
  Safari: {
    garmentType: 'Safari',
    displayName: 'Classic Safari Suit & Shirt',
    category: 'Formal & Casual',
    requiredParameters: [
      'neck', 'collar', 'shoulder', 'chest', 'waist', 'sleeveLength', 'bicep', 'shirtLength', 'armhole', 'backLength'
    ],
    estimatedFabricMeters: 2.75,
    allowComparison: true
  },
  Pathani: {
    garmentType: 'Pathani',
    displayName: 'Royal Pathani Suit & Salwar',
    category: 'Ethnic & Royal',
    requiredParameters: [
      'neck', 'collar', 'shoulder', 'chest', 'waist', 'hip', 'sleeveLength', 'kurtaLength', 'armhole', 'pantLength'
    ],
    estimatedFabricMeters: 3.40,
    allowComparison: true
  },
  'Night Suit': {
    garmentType: 'Night Suit',
    displayName: 'Luxury Lounge Night Suit',
    category: 'Casualwear',
    requiredParameters: [
      'neck', 'shoulder', 'chest', 'waist', 'sleeveLength', 'shirtLength',
      'waist_pant', 'hip', 'pantLength', 'inseam', 'bottom'
    ],
    estimatedFabricMeters: 3.20,
    allowComparison: true
  },
  Custom: {
    garmentType: 'Custom',
    displayName: 'Master Bespoke Custom Pattern',
    category: 'Bespoke',
    requiredParameters: Object.keys(ANATOMICAL_PARAMETERS),
    estimatedFabricMeters: 3.50,
    allowComparison: true
  }
};

// Helper utility to produce default specification payload for any garment type
export function getDefaultGarmentSpecs(garmentType: string): Record<string, number> {
  const spec = GARMENT_REGISTRY[garmentType] || GARMENT_REGISTRY['Custom'];
  const defaults: Record<string, number> = {};
  spec.requiredParameters.forEach(paramId => {
    const p = ANATOMICAL_PARAMETERS[paramId];
    if (p) {
      defaults[paramId] = p.defaultInches;
    }
  });
  return defaults;
}
