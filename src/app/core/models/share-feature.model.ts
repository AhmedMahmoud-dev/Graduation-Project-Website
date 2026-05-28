import { ApiResponse } from './api-response.model';

export interface ShareLinkResponseDto {
  share_token: string;
  share_url: string;
}

export interface ActiveShareResponseDto {
  client_id: string;
  share_token: string;
  type: 'Text' | 'Audio' | 'Image' | 'Video';
  shared_at: string;
  timestamp: string;
}

export interface SharedAnalysisDto {
  client_id: string;
  type: 'Text' | 'Audio' | 'Image' | 'Video';
  timestamp: string;
  result: any;
}
