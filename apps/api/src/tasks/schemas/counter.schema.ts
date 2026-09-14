import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

export type CounterDocument = HydratedDocument<Counter>;

@Schema({ collection: 'counters' })
export class Counter {
    @Prop({
    type: Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true,
    })
    projectId: Types.ObjectId;

    @Prop({
    required: true,
    min: 0,
    default: 0,
    })
    lastNumber: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);