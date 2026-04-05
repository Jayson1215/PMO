export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'borrower';
export type EquipmentStatus = 'available' | 'maintenance' | 'unavailable';
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'borrowed' | 'returned' | 'overdue' | 'cancelled';
export type NotificationType = 'booking_confirmed' | 'booking_approved' | 'booking_rejected' | 'reminder_2hr' | 'reminder_30min' | 'reminder_15min' | 'overdue' | 'returned';
export type EquipmentCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          department: string | null;
          contact_number: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          two_factor_secret: string | null;
          two_factor_enabled: boolean;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          department?: string | null;
          contact_number?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          two_factor_secret?: string | null;
          two_factor_enabled?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          department?: string | null;
          contact_number?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
          two_factor_secret?: string | null;
          two_factor_enabled?: boolean;
        };
        Relationships: [];
      };
      equipment_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          icon?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          icon?: string | null;
        };
        Relationships: [];
      };
      equipment: {
        Row: {
          id: string;
          name: string;
          category_id: string | null;
          description: string | null;
          total_quantity: number;
          available_quantity: number;
          image_url: string | null;
          status: EquipmentStatus;
          condition: EquipmentCondition;
          serial_number: string | null;
          location: string | null;
          notes: string | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category_id?: string | null;
          description?: string | null;
          total_quantity?: number;
          available_quantity?: number;
          image_url?: string | null;
          status?: EquipmentStatus;
          condition?: EquipmentCondition;
          serial_number?: string | null;
          location?: string | null;
          notes?: string | null;
          is_archived?: boolean;
        };
        Update: {
          name?: string;
          category_id?: string | null;
          description?: string | null;
          total_quantity?: number;
          available_quantity?: number;
          image_url?: string | null;
          status?: EquipmentStatus;
          condition?: EquipmentCondition;
          serial_number?: string | null;
          location?: string | null;
          notes?: string | null;
          is_archived?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "equipment_categories";
            referencedColumns: ["id"];
          }
        ];
      };
      bookings: {
        Row: {
          id: string;
          booking_code: string;
          borrower_id: string;
          equipment_id: string;
          quantity: number;
          borrower_name: string;
          borrower_email: string;
          department: string | null;
          purpose: string;
          borrow_date: string;
          return_date: string;
          actual_return_date: string | null;
          status: BookingStatus;
          admin_notes: string | null;
          approved_by: string | null;
          approved_at: string | null;
          returned_condition: EquipmentCondition | null;
          damage_notes: string | null;
          damage_image_url: string | null;
          qr_code: string | null;
          reminder_2hr_sent: boolean;
          reminder_30min_sent: boolean;
          reminder_15min_sent: boolean;
          overdue_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_code?: string;
          borrower_id: string;
          equipment_id: string;
          quantity?: number;
          borrower_name: string;
          borrower_email: string;
          department?: string | null;
          purpose: string;
          borrow_date: string;
          return_date: string;
          actual_return_date?: string | null;
          status?: BookingStatus;
          admin_notes?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          returned_condition?: EquipmentCondition | null;
          damage_notes?: string | null;
          damage_image_url?: string | null;
          qr_code?: string | null;
        };
        Update: {
          booking_code?: string;
          borrower_id?: string;
          equipment_id?: string;
          quantity?: number;
          borrower_name?: string;
          borrower_email?: string;
          department?: string | null;
          purpose?: string;
          borrow_date?: string;
          return_date?: string;
          actual_return_date?: string | null;
          status?: BookingStatus;
          admin_notes?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          returned_condition?: EquipmentCondition | null;
          damage_notes?: string | null;
          damage_image_url?: string | null;
          qr_code?: string | null;
          reminder_2hr_sent?: boolean;
          reminder_30min_sent?: boolean;
          reminder_15min_sent?: boolean;
          overdue_sent?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_borrower_id_fkey";
            columns: ["borrower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          booking_id: string | null;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          email_sent: boolean;
          email_sent_at: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id?: string | null;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          email_sent?: boolean;
          email_sent_at?: string | null;
          is_read?: boolean;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
          email_sent?: boolean;
          email_sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          table_name: string;
          record_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          table_name: string;
          record_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      damage_reports: {
        Row: {
          id: string;
          booking_id: string;
          equipment_id: string;
          reported_by: string;
          description: string;
          severity: string;
          image_url: string | null;
          resolved: boolean;
          resolved_at: string | null;
          resolved_by: string | null;
          resolution_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          equipment_id: string;
          reported_by: string;
          description: string;
          severity: string;
          image_url?: string | null;
        };
        Update: {
          resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "damage_reports_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "damage_reports_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "damage_reports_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_booking_overlap: {
        Args: {
          p_equipment_id: string;
          p_borrow_date: string;
          p_return_date: string;
          p_quantity: number;
          p_exclude_booking_id: string | null;
        };
        Returns: boolean;
      };
      generate_booking_code: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      equipment_status: EquipmentStatus;
      booking_status: BookingStatus;
      notification_type: NotificationType;
      equipment_condition: EquipmentCondition;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Equipment = Database['public']['Tables']['equipment']['Row'];
export type EquipmentCategory = Database['public']['Tables']['equipment_categories']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type DamageReport = Database['public']['Tables']['damage_reports']['Row'];

// Extended types with relations
export type BookingWithDetails = Booking & {
  equipment: Pick<Equipment, 'id' | 'name' | 'image_url' | 'category_id'>;
  profiles: Pick<Profile, 'id' | 'full_name' | 'email' | 'department'>;
};

export type EquipmentWithCategory = Equipment & {
  equipment_categories: Pick<EquipmentCategory, 'id' | 'name' | 'icon'> | null;
};
