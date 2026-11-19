import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AlertSubscription,
  AlertSubscriptionDocument,
} from './schemas/alert-subscription.schema';
import { SubscribeAlertDto } from './dto/subscribe-alert.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectModel(AlertSubscription.name)
    private readonly alertSubModel: Model<AlertSubscriptionDocument>,
  ) {}

  async subscribe(dto: SubscribeAlertDto): Promise<Record<string, unknown>> {
    const contactNormalized = dto.contactInfo.trim().toLowerCase();
    const stateFilter = (dto.stateFilter ?? 'ALL').trim().toUpperCase();
    const agencyFilter = (dto.agencyFilter ?? 'ALL').trim().toUpperCase();

    const sub = await this.alertSubModel.findOneAndUpdate(
      {
        contactInfo: contactNormalized,
        channel: dto.channel,
      },
      {
        $set: {
          contactInfo: contactNormalized,
          channel: dto.channel,
          stateFilter,
          agencyFilter,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return {
      message: 'Subscribed to instant recruitment alerts successfully',
      subscription: {
        id: sub._id,
        contactInfo: sub.contactInfo,
        channel: sub.channel,
        stateFilter: sub.stateFilter,
        agencyFilter: sub.agencyFilter,
        isActive: sub.isActive,
      },
    };
  }
}
