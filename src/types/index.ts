export type EquipmentCategory = 
  | 'IT' 
  | 'Manufacturing' 
  | 'Vehicles' 
  | 'Tools' 
  | 'Facilities' 
  | 'Medical' 
  | 'Ground Support' 
  | 'Conduits' 
  | 'Electrical';

export type EquipmentStatus = 'Available' | 'In Use' | 'Under Maintenance' | 'Retired';

export type RequestStatus = 'Submitted' | 'In Review' | 'Approved' | 'Scheduled' | 'Completed' | 'Rejected';
export type WorkOrderStatus = RequestStatus;

export type RequestPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type WorkOrderPriority = RequestPriority;

export type MaterialStockStatus = 'IN STOCK' | 'LOW / REORDER' | 'OUT OF STOCK';

export interface TechnicalSpecs {
  // Engine
  engineModel?: string;
  engineHorsepower?: string;
  fuelType?: string;
  engineSerial?: string;
  operatingHours?: number;
  // Electrical
  systemVoltage?: string;
  batteryModel?: string;
  alternatorRating?: string;
  lightingType?: string;
  // Hydraulic
  hydraulicPump?: string;
  systemPressurePsi?: number;
  fluidType?: string;
  cylinderCount?: number;
  // Transmission
  transmissionType?: string;
  driveAxle?: string;
  gearboxModel?: string;
  // Tires & Brakes
  tireSizeFront?: string;
  tireSizeRear?: string;
  tirePressurePsi?: number;
  brakeCondition?: string;
  lastBrakeInspection?: string;
  // Filters & Components
  oilFilterPart?: string;
  fuelFilterPart?: string;
  airFilterPart?: string;
  hydraulicFilterPart?: string;
  lastFilterChange?: string;
}

export interface Equipment {
  id: string;
  name: string;
  assetTag: string;
  category: EquipmentCategory;
  status: EquipmentStatus;
  location: string;
  serialNumber: string;
  purchaseDate: string;
  owner: string;
  ownerCompany: string;
  vendor: string;
  vendorCompany: string;
  description: string;
  imageUrl: string;
  operatingHours: number;
  specs: TechnicalSpecs;
  assignedClientEmail?: string;
  assignedClientCompany?: string;
}

export interface WorkOrder {
  id: string;
  requestTitle: string; // Title / Description summary
  equipmentId: string;
  equipmentName: string;
  assetTag: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  requestedDate: string;
  scheduledDate?: string;
  completionDate?: string;
  requestedBy: string;
  requesterEmail: string;
  requesterCompany: string;
  description: string;
  assignedTechnician?: string;
  estimatedHours?: number;
  actualHours?: number;
  partsUsed?: {
    itemCode: string;
    itemName: string;
    qty: number;
  }[];
  resolutionNotes?: string;
}

// Alias for backward compatibility
export type MaintenanceRequest = WorkOrder;

export interface PMSEvent {
  id: string;
  title: string;
  equipmentId: string;
  equipmentName: string;
  assetTag: string;
  category: EquipmentCategory;
  programType: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | '500-Hour' | '1000-Hour';
  scheduledDate: string; // YYYY-MM-DD
  status: 'Upcoming' | 'In Progress' | 'Completed' | 'Overdue';
  assignedTechnician: string;
  checklists: { item: string; done: boolean }[];
  notes?: string;
}

export interface MaterialItem {
  itemCode: string;
  item: string;
  materialType: 'SPARE PARTS' | 'CONSUMABLE' | 'TOOLS AND EQUIPMENT';
  category: string;
  uom: string; // PCS, L, PAIL, LBS
  partNumber: string;
  make: string;
  specification: string;
  min: number;
  max: number;
  totalInbound: number;
  totalOutbound: number;
  stockOnHand: number;
  stockStatus: MaterialStockStatus;
  recommendedReorder: number;
  storageBin?: string;
}

export interface UserPersona {
  email: string;
  name: string;
  role: 'admin' | 'client';
  company: string;
  /**
   * For 'client' role:
   * - 'ALL_CLIENT_EQUIPMENT' (default): can view all Client Equipment (any work order not marked as "Internal")
   * - Specific client string: filters to that specific non-Internal client name
   */
  clientScope?: string;
  avatarLetter: string;
  avatarBg: string;
}

