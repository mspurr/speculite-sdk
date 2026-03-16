import type {
  V2AnchorBundleResponse,
  V2AttestationsResponse,
  V2ChallengeCreateRequest,
  V2ChallengeResponse,
  V2ChallengesResponse,
  V2EvidenceResponse,
  V2MarketPlanRequest,
  V2MarketPlanResponse,
  V2MarketResponse,
  V2PlannerRunsResponse,
  V2ResolutionResponse
} from '../types.js';
import { LifecycleClient } from './lifecycleClient.js';

export class V2Client extends LifecycleClient {
  async planV2Market(payload: V2MarketPlanRequest): Promise<V2MarketPlanResponse> {
    return this.request('POST', '/api/v2/markets/plan', {
      body: payload
    });
  }

  async createV2Market(payload: V2MarketPlanRequest): Promise<V2MarketResponse> {
    return this.request('POST', '/api/v2/markets', {
      body: payload
    });
  }

  async getV2Market(marketId: string): Promise<V2MarketResponse> {
    return this.request('GET', `/api/v2/markets/${marketId.trim()}`);
  }

  async resolveV2Market(marketId: string): Promise<V2ResolutionResponse> {
    return this.request('POST', `/api/v2/markets/${marketId.trim()}/resolve`);
  }

  async getV2MarketEvidence(marketId: string): Promise<V2EvidenceResponse> {
    return this.request('GET', `/api/v2/markets/${marketId.trim()}/evidence`);
  }

  async getV2MarketAttestations(marketId: string): Promise<V2AttestationsResponse> {
    return this.request('GET', `/api/v2/markets/${marketId.trim()}/attestations`);
  }

  async getV2MarketAnchorBundle(marketId: string): Promise<V2AnchorBundleResponse> {
    return this.request('GET', `/api/v2/markets/${marketId.trim()}/anchor-bundle`);
  }

  async getV2MarketPlannerRuns(marketId: string): Promise<V2PlannerRunsResponse> {
    return this.request('GET', `/api/v2/markets/${marketId.trim()}/planner-runs`);
  }

  async createV2MarketChallenge(
    marketId: string,
    payload: V2ChallengeCreateRequest
  ): Promise<V2ChallengeResponse> {
    return this.request('POST', `/api/v2/markets/${marketId.trim()}/challenges`, {
      body: payload
    });
  }

  async getV2MarketChallenges(marketId: string): Promise<V2ChallengesResponse> {
    return this.request('GET', `/api/v2/markets/${marketId.trim()}/challenges`);
  }
}
