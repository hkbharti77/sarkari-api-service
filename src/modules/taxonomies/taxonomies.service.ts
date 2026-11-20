import { Injectable, Logger, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organization.schema';
import { Category, CategoryDocument } from './schemas/category.schema';
import { State, StateDocument } from './schemas/state.schema';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateStateDto } from './dto/create-state.dto';
import {
  SEED_ORGANIZATIONS,
  SEED_CATEGORIES,
  SEED_STATES,
} from './seeds/master-taxonomies.seed';

@Injectable()
export class TaxonomiesService implements OnModuleInit {
  private readonly logger = new Logger(TaxonomiesService.name);

  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(State.name)
    private readonly stateModel: Model<StateDocument>,
  ) {}

  async onModuleInit() {
    try {
      await this.seedMasterTaxonomies();
    } catch (err: unknown) {
      this.logger.warn(`Initial taxonomy seeding skipped or encountered error: ${err}`);
    }
  }

  // Organizations
  async findAllOrganizations(): Promise<Organization[]> {
    const currentCount = await this.orgModel.countDocuments();
    if (currentCount < SEED_ORGANIZATIONS.length) {
      await this.seedMasterTaxonomies();
    }
    return this.orgModel.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  async findOrganizationBySlug(slug: string): Promise<Organization | null> {
    return this.orgModel.findOne({ slug: slug.toLowerCase() }).exec();
  }

  async createOrganization(dto: CreateOrganizationDto): Promise<Organization> {
    const existing = await this.orgModel.findOne({ slug: dto.slug.toLowerCase() });
    if (existing) {
      throw new ConflictException(`Organization with slug "${dto.slug}" already exists`);
    }
    const created = new this.orgModel({
      ...dto,
      slug: dto.slug.toLowerCase(),
      shortName: dto.shortName.toUpperCase(),
    });
    return created.save();
  }

  // Categories
  async findAllCategories(): Promise<Category[]> {
    return this.categoryModel.find({ isActive: true }).sort({ sortOrder: 1 }).exec();
  }

  async findCategoryBySlug(slug: string): Promise<Category | null> {
    return this.categoryModel.findOne({ slug: slug.toLowerCase() }).exec();
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoryModel.findOne({ slug: dto.slug.toLowerCase() });
    if (existing) {
      throw new ConflictException(`Category with slug "${dto.slug}" already exists`);
    }
    const created = new this.categoryModel({
      ...dto,
      slug: dto.slug.toLowerCase(),
    });
    return created.save();
  }

  // States
  async findAllStates(): Promise<State[]> {
    return this.stateModel.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  async findStateByCode(code: string): Promise<State | null> {
    return this.stateModel.findOne({ code: code.toUpperCase() }).exec();
  }

  async createState(dto: CreateStateDto): Promise<State> {
    const existing = await this.stateModel.findOne({ code: dto.code.toUpperCase() });
    if (existing) {
      throw new ConflictException(`State with code "${dto.code}" already exists`);
    }
    const created = new this.stateModel({
      ...dto,
      code: dto.code.toUpperCase(),
      slug: dto.slug.toLowerCase(),
    });
    return created.save();
  }

  // Seeding master data
  async seedMasterTaxonomies(): Promise<{
    organizationsCount: number;
    categoriesCount: number;
    statesCount: number;
  }> {
    this.logger.log('Starting master taxonomies seed operation...');

    // Seed Organizations
    for (const org of SEED_ORGANIZATIONS) {
      await this.orgModel.updateOne(
        { slug: org.slug },
        { $set: org },
        { upsert: true }
      );
    }

    // Seed Categories
    for (const cat of SEED_CATEGORIES) {
      await this.categoryModel.updateOne(
        { slug: cat.slug },
        { $setOnInsert: cat },
        { upsert: true }
      );
    }

    // Seed States
    for (const st of SEED_STATES) {
      await this.stateModel.updateOne(
        { code: st.code },
        { $setOnInsert: st },
        { upsert: true }
      );
    }

    const organizationsCount = await this.orgModel.countDocuments();
    const categoriesCount = await this.categoryModel.countDocuments();
    const statesCount = await this.stateModel.countDocuments();

    this.logger.log(
      `Master seed complete: ${organizationsCount} orgs, ${categoriesCount} categories, ${statesCount} states.`
    );

    return { organizationsCount, categoriesCount, statesCount };
  }
}
