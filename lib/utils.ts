import {ICOState, TokenReservation, TokenGroup} from '../contracts';

export type NU = null | undefined;
// tslint:disable-next-line:interface-over-type-literal
export type KVMap = {
  [option: string]: any;
};
export * from './utils/files';
export * from './utils/strings';

export function tokenGroupIdToName(group: any): TokenGroup {
    const groupId = parseInt(group);
    switch (groupId) {
        case TokenReservation.Staff:
            return 'staff';
        case TokenReservation.Utility:
            return 'utility';
        default:
            throw new Error(`Unknown token groupId: ${group}`);
    }
}

export function tokenGroupToId(group: TokenGroup): number {
    switch (group) {
        case 'staff':
            return TokenReservation.Staff;
        case 'utility':
            return TokenReservation.Utility;
        default:
            throw new Error(`Unknown token group: ${group}`);
    }
}

export function toIcoStateIdToName(val: BigNumber.BigNumber): string {
    switch (val.toNumber()) {
        case ICOState.Inactive:
            return 'Inactive';
        case ICOState.Active:
            return 'Active';
        case ICOState.Suspended:
            return 'Suspended';
        case ICOState.Terminated:
            return 'Terminated';
        case ICOState.NotCompleted:
            return 'NotCompleted';
        case ICOState.Completed:
            return 'Completed';
        default:
            throw new Error(`Unknown ico state: ${val}`);
    }
}
