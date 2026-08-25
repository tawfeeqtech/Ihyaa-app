<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * يستخدم قائمة التصنيفات القانونية (15) بدل slug عشوائي من Faker —
     * حتى لا يتلوث DB التطوير بسلَغات غير معروفة للواجهة (كانت تسبب
     * undefined في sectorLabels). مصدر الحقيقة الوحيد هو CategorySeeder.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $canonical = [
            'fintech' => 'التقنية المالية', 'healthtech' => 'التقنية الصحية',
            'edtech' => 'التقنية التعليمية', 'ecommerce' => 'التجارة الإلكترونية',
            'saas' => 'البرمجيات كخدمة', 'ai' => 'الذكاء الاصطناعي',
            'agritech' => 'التقنية الزراعية', 'logistics' => 'اللوجستيات',
            'real_estate' => 'العقارات', 'energy' => 'الطاقة',
            'gaming' => 'الألعاب', 'social' => 'الشبكات الاجتماعية',
            'marketplace' => 'الأسواق الرقمية', 'tourism' => 'السياحة',
            'other' => 'أخرى',
        ];

        $slug = fake()->randomElement(array_keys($canonical));

        return [
            'name_ar' => $canonical[$slug],
            'name_en' => ucfirst(str_replace('_', ' ', $slug)),
            'slug' => $slug,
            'icon' => fake()->randomElement(['bank', 'robot', 'cloud', 'truck']),
            'sort_order' => fake()->numberBetween(1, 20),
            'is_active' => true,
        ];
    }
}
