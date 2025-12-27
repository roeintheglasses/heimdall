import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';

export const runtime = 'edge';

interface QStashPayload {
  type: string;
  event: any;
}

// Handle CORS preflight requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, X-GitHub-Event, X-Hub-Signature-256, X-Railway-Event, X-Railway-Project, X-Railway-Service',
    },
  });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.text();
    const githubEvent = req.headers.get('x-github-event');
    const vercelEvent = req.headers.get('x-vercel-deployment-url');
    const railwayEvent = req.headers.get('x-railway-event');
    const signature = req.headers.get('x-hub-signature-256');

    // Enhanced logging for debugging
    const allHeaders = Object.fromEntries(req.headers.entries());
    const parsedPayload = body ? JSON.parse(body) : null;

    console.log('Webhook received v2:', {
      githubEvent,
      vercelEvent,
      railwayEvent,
      hasSignature: !!signature,
      bodyLength: body.length,
      timestamp: new Date().toISOString(),
      headers: allHeaders,
      payloadType: parsedPayload?.type,
      payloadKeys: parsedPayload ? Object.keys(parsedPayload) : [],
    });

    // Verify GitHub webhook signature if present
    const webhookSecret = process.env.WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET;
    if (githubEvent && signature && webhookSecret) {
      console.log('Verifying webhook signature...');
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      const expectedSignature =
        'sha256=' +
        Array.from(new Uint8Array(signatureBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

      if (expectedSignature !== signature) {
        console.error('Webhook signature verification failed:', {
          expected: expectedSignature,
          received: signature,
        });
        return new NextResponse('Invalid signature', { status: 401 });
      }
      console.log('Webhook signature verified successfully');
    } else if (githubEvent && signature) {
      console.warn('Webhook secret not configured - skipping signature verification');
    }

    // Use the parsed payload from above
    const payload = parsedPayload;

    // Determine event type and create QStash payload
    let qstashPayload: QStashPayload;

    console.log('Detection attempt v3:', {
      githubEvent,
      vercelEvent,
      railwayEvent,
      payloadType: payload?.type,
      payloadEvent: payload?.event,
      hasProject: !!payload?.project,
      hasDeployment: !!payload?.deployment,
      hasPayloadPayload: !!payload?.payload,
      isGithubPush: githubEvent === 'push',
      isRailwayByType: payload && payload.type === 'DEPLOY',
      isRailwayByEvent:
        payload &&
        payload.event &&
        (payload.event.includes('deployment') || payload.event.includes('deploy')),
      isRailwayByHeader: !!railwayEvent,
      isRailwayByStructure: payload && payload.project && payload.deployment && !payload.payload,
      isVercelByHeader: !!vercelEvent,
      isVercelByStructure: payload?.type?.startsWith('deployment.') && !!payload?.payload,
    });

    if (githubEvent === 'push') {
      qstashPayload = {
        type: 'github.push',
        event: payload,
      };
    } else if (githubEvent === 'pull_request') {
      qstashPayload = {
        type: 'github.pr',
        event: payload,
      };
    } else if (githubEvent === 'issues') {
      qstashPayload = {
        type: 'github.issue',
        event: payload,
      };
    } else if (githubEvent === 'release') {
      qstashPayload = {
        type: 'github.release',
        event: payload,
      };
    } else if (
      // Comprehensive Railway detection - check multiple possible formats
      (payload && payload.type === 'DEPLOY') || // Format: {"type": "DEPLOY", ...}
      (payload &&
        payload.event &&
        (payload.event.includes('deployment') || payload.event.includes('deploy'))) || // Format: {"event": "deployment.completed", ...}
      (railwayEvent && (railwayEvent.includes('deployment') || railwayEvent === 'deploy')) || // Railway header
      (payload && payload.project && payload.deployment && !payload.payload) // Railway structure (no nested payload)
    ) {
      // Railway webhook detected
      console.log('Railway webhook detected v3!', {
        detectionMethod:
          payload?.type === 'DEPLOY'
            ? 'type-DEPLOY'
            : payload?.event?.includes('deployment')
              ? 'event-deployment'
              : railwayEvent
                ? 'header'
                : 'structure',
        payloadType: payload?.type,
        payloadEvent: payload?.event,
        railwayHeader: railwayEvent,
        hasProject: !!payload?.project,
        hasDeployment: !!payload?.deployment,
        projectName: payload?.project?.name,
        fullPayload: payload,
      });
      qstashPayload = {
        type: 'railway.deploy',
        event: payload,
      };
    } else if (
      vercelEvent ||
      (payload?.type && payload.type.startsWith('deployment.') && payload?.payload)
    ) {
      // Vercel webhook detected (has payload.payload structure)
      console.log('Vercel webhook detected v3', {
        vercelEvent: !!vercelEvent,
        payloadType: payload?.type,
        hasPayloadPayload: !!payload?.payload,
        isDeploymentType: payload?.type?.startsWith('deployment.'),
      });
      qstashPayload = {
        type: 'vercel.deploy',
        event: payload,
      };
    } else {
      console.log('Unknown event type v3 - payload:', payload);
      return new NextResponse('Unknown event type', { status: 400 });
    }

    // Check if QStash is configured
    const qstashToken = process.env.QSTASH_TOKEN;
    const goServiceUrl =
      process.env.GO_SERVICE_URL || 'https://heimdall-backend-prod.up.railway.app';

    if (qstashToken) {
      // Use QStash for reliable message queuing
      console.log('Using QStash for webhook processing:', {
        eventType: qstashPayload.type,
        destination: goServiceUrl,
      });

      try {
        const qstash = new Client({ token: qstashToken });

        const result = await qstash.publishJSON({
          url: `${goServiceUrl}/api/webhook`,
          body: qstashPayload,
          headers: {
            'Content-Type': 'application/json',
          },
          // Add retry configuration for better reliability
          retries: 3,
          delay: 1000, // 1 second delay between retries
        });

        console.log('Message queued successfully via QStash:', {
          messageId: result.messageId,
          eventType: qstashPayload.type,
        });
      } catch (qstashError) {
        console.error('QStash queueing failed, falling back to direct call:', qstashError);

        // Fallback to direct call if QStash fails
        const response = await fetch(`${goServiceUrl}/api/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(qstashPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Fallback webhook processing failed:', {
            status: response.status,
            error: errorText,
            goServiceUrl,
            eventType: qstashPayload.type,
          });
          return new NextResponse(`Failed to process webhook: ${response.status}`, { status: 500 });
        }
      }
    } else {
      // Direct forwarding when QStash is not configured
      console.log('QStash not configured, forwarding directly to Go service:', {
        eventType: githubEvent || 'vercel',
        url: goServiceUrl,
      });

      const response = await fetch(`${goServiceUrl}/api/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(qstashPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to process webhook:', {
          status: response.status,
          error: errorText,
          goServiceUrl,
          eventType: qstashPayload.type,
        });
        return new NextResponse(`Failed to process webhook: ${response.status}`, { status: 500 });
      }
    }

    const processingTime = Date.now() - startTime;
    console.log('Webhook processed successfully:', {
      eventType: qstashPayload.type,
      processingTime: `${processingTime}ms`,
    });

    return new NextResponse('Webhook processed successfully', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
