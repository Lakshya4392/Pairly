import { useEffect, useCallback } from 'react';
import RealtimeService from '@services/RealtimeService';
import MomentService from '@services/MomentService';

interface UseRealtimeOptions {
  userId: string;
  onNewMoment?: (data: any) => void;
  onPartnerConnected?: (data: any) => void;
  onPartnerDisconnected?: (data: any) => void;
  onPartnerUpdated?: (data: any) => void;
  onReconnect?: () => void;
}

/**
 * Custom hook for real-time Socket.IO connection
 */
export const useRealtime = (options: UseRealtimeOptions) => {
  const {
    userId,
    onNewMoment,
    onPartnerConnected,
    onPartnerDisconnected,
    onPartnerUpdated,
    onReconnect,
  } = options;

  // Handle new moment
  const handleNewMoment = useCallback(
    async (data: any) => {
      console.log('New moment event:', data);
      
      // Acknowledge receipt
      RealtimeService.acknowledgeMoment(data.momentId);
      
      // Fetch the actual moment data
      try {
        const moment = await MomentService.getLatestMoment();
        if (moment && onNewMoment) {
          onNewMoment(moment);
        }
      } catch (error) {
        console.error('Error fetching moment:', error);
      }
    },
    [onNewMoment]
  );

  // Handle partner connected
  const handlePartnerConnected = useCallback(
    (data: any) => {
      console.log('Partner connected event:', data);
      if (onPartnerConnected) {
        onPartnerConnected(data);
      }
    },
    [onPartnerConnected]
  );

  // Handle partner disconnected
  const handlePartnerDisconnected = useCallback(
    (data: any) => {
      console.log('Partner disconnected event:', data);
      if (onPartnerDisconnected) {
        onPartnerDisconnected(data);
      }
    },
    [onPartnerDisconnected]
  );

  // Handle partner updated
  const handlePartnerUpdated = useCallback(
    (data: any) => {
      console.log('Partner updated event:', data);
      if (onPartnerUpdated) {
        onPartnerUpdated(data);
      }
    },
    [onPartnerUpdated]
  );

  // Handle reconnect
  const handleReconnect = useCallback(() => {
    console.log('Reconnected to Socket.IO');
    if (onReconnect) {
      onReconnect();
    }
  }, [onReconnect]);

  useEffect(() => {
    // Connect to Socket.IO
    const connectSocket = async () => {
      try {
        await RealtimeService.connect(userId);
        
        // Register event listeners
        RealtimeService.on('new_moment', handleNewMoment);
        RealtimeService.on('partner_connected', handlePartnerConnected);
        RealtimeService.on('partner_disconnected', handlePartnerDisconnected);
        RealtimeService.on('partner_updated', handlePartnerUpdated);
        RealtimeService.on('reconnect', handleReconnect);
      } catch (error) {
        console.error('Failed to connect to Socket.IO:', error);
      }
    };

    connectSocket();

    // Cleanup on unmount
    return () => {
      RealtimeService.off('new_moment', handleNewMoment);
      RealtimeService.off('partner_connected', handlePartnerConnected);
      RealtimeService.off('partner_disconnected', handlePartnerDisconnected);
      RealtimeService.off('partner_updated', handlePartnerUpdated);
      RealtimeService.off('reconnect', handleReconnect);
    };
  }, [
    userId,
    handleNewMoment,
    handlePartnerConnected,
    handlePartnerDisconnected,
    handlePartnerUpdated,
    handleReconnect,
  ]);

  return {
    isConnected: RealtimeService.getConnectionStatus(),
    disconnect: () => RealtimeService.disconnect(),
  };
};
