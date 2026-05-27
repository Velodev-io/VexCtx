import axios from 'axios';

export interface ContextEvent {
  event_type: string;
  source_app: string;
  content: string;
  metadata?: Record<string, any>;
  session_id: string;
  user_id?: string;
  project_id?: string;
  sensitivity?: 'low' | 'high' | 'excluded';
  exclude_from_export?: boolean;
  ai_assisted?: boolean;
}

export class VexCTX {
  private baseUrl: string;

  constructor(config: { baseUrl?: string } = {}) {
    this.baseUrl = (config.baseUrl || 'http://localhost:8765').replace(/\/$/, '');
  }

  async addEvent(event: ContextEvent): Promise<any> {
    const payload = {
      user_id: 'default',
      sensitivity: 'low',
      exclude_from_export: false,
      ai_assisted: true,
      ...event
    };
    const response = await axios.post(`${this.baseUrl}/events`, payload);
    return response.data;
  }

  async getTimeline(limit: number = 50, offset: number = 0): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/timeline`, {
      params: { limit, offset }
    });
    return response.data;
  }

  async exportVault(vaultId: string = 'default_vault'): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/vault/export`, null, {
      params: { vault_id: vaultId }
    });
    return response.data;
  }

  async importVault(data: any, vaultId: string = 'default_vault'): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/vault/import`, data, {
      params: { vault_id: vaultId }
    });
    return response.data;
  }

  async search(params: {
    query: string;
    project_id?: string;
    source_app?: string;
    start_date?: string;
    end_date?: string;
    event_type?: string;
    top_k?: number;
    chunk_type?: string;
    vault_id?: string;
  }): Promise<any> {
    const payload = {
      top_k: 10,
      chunk_type: 'session',
      vault_id: 'default_vault',
      ...params
    };
    const response = await axios.post(`${this.baseUrl}/retrieve/search`, payload);
    return response.data;
  }

  async getSummary(params: {
    query: string;
    project_id?: string;
    source_app?: string;
    start_date?: string;
    end_date?: string;
    event_type?: string;
    chunk_type?: string;
    vault_id?: string;
  }): Promise<any> {
    const payload = {
      chunk_type: 'session',
      vault_id: 'default_vault',
      ...params
    };
    const response = await axios.post(`${this.baseUrl}/retrieve/summary`, payload);
    return response.data;
  }

  async createAgentBundle(params: {
    project_id?: string;
    query?: string;
    source_app?: string;
    start_date?: string;
    end_date?: string;
    chunk_type?: string;
    vault_id?: string;
  }): Promise<any> {
    const payload = {
      chunk_type: 'session',
      vault_id: 'default_vault',
      ...params
    };
    const response = await axios.post(`${this.baseUrl}/retrieve/agent-bundle`, payload);
    return response.data;
  }
}
