import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from '../src/users/users.service';
import { User } from '../src/users/schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;
  const mockModel = {
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: '1' }]) }),
    findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: '1' }) }),
    create: jest.fn().mockResolvedValue({ toObject: () => ({ _id: '1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: '1' }) }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockModel },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('findAll returns list', async () => {
    const res = await service.findAll();
    expect(res).toEqual([{ _id: '1' }]);
  });

  it('findById returns user', async () => {
    const res = await service.findById('1');
    expect(res).toEqual({ _id: '1' });
  });

  it('create returns created user', async () => {
    const res = await service.create({ email: 'u@example.com', password: 'pass' } as any);
    expect(res).toEqual({ _id: '1' });
  });

  it('update returns updated user', async () => {
    const res = await service.update('1', { username: 'new' });
    expect(res).toEqual({ _id: '1' });
  });

  it('softDelete updates deleted flag', async () => {
    mockModel.findByIdAndUpdate.mockResolvedValueOnce({}); // simulate success
    await expect(service.softDelete('1')).resolves.toBeUndefined();
  });
});