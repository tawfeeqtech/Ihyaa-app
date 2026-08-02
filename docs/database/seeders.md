# Seeders — قاعدة بيانات منصة إحياء (Ihyaa)

**الإصدار:** 1.0 · **التاريخ:** 2026-08-02
**الإطار:** Laravel 13 + PHP 8.3 · **المرجع:** `docs/database/migrations.md` (الجدول 11)

---

## 1. الاستراتيجية العامة

| البند | القرار |
|-------|--------|
| بيانات البذرة | 15 مستخدماً (5 `idea_owner` + 5 `investor` + 5 `admin`) · 10 مشاريع عربية · 15 تصنيفاً · 3 أدوار |
| ترتيب التنفيذ | `RoleSeeder` → `CategorySeeder` → `UserSeeder` → `ProjectSeeder` → (اختياري) `DemoEvaluationSeeder` |
| الإيدامونية (Idempotency) | كل seeder يستخدم `updateOrCreate`/`firstOrCreate` — إعادة التشغيل لا تكرر الصفوف |
| كلمة المرور | `password` للجميع (بيئة تطوير فقط — غيّرها في الإنتاج، وانظر §7) |
| التحقق من البريد | جميع المستخدمين `email_verified_at = now()` (مطلوب للدخول — SRS-F01-02) |
| `admin` | **Seeder فقط — لا تسجيل عام** (SRS §1.2) |
| ملفات المشاريع | لا تُزرع ملفات فعلية (رفع عند التشغيل فقط) — التجربة تعتمد على بيانات حقيقية عند الرفع |
| النماذج المطلوبة | `App\Models\{Role, Category, User, Project, AiEvaluation}` مع `$fillable` و`$casts` |

---

## 2. `RoleSeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'idea_owner', 'display_name' => 'صاحب فكرة', 'description' => 'يرفع المشاريع ويدير طلبات الاهتمام'],
            ['name' => 'investor',   'display_name' => 'مستثمر',    'description' => 'يبحث ويحفظ المشاريع ويبدي الاهتمام'],
            ['name' => 'admin',      'display_name' => 'مشرف',      'description' => 'لوحة التحليلات والتصدير CSV — يُنشأ عبر seeder فقط'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['name' => $role['name']], $role);
        }
    }
}
```

---

## 3. `CategorySeeder.php` — 15 تصنيفاً

```php
<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name_ar' => 'التجارة الإلكترونية',          'name_en' => 'E-commerce',        'slug' => 'ecommerce',     'icon' => 'shopping-cart'],
            ['name_ar' => 'التعليم والتقنية التعليمية',   'name_en' => 'EdTech',            'slug' => 'edtech',        'icon' => 'graduation-cap'],
            ['name_ar' => 'الذكاء الاصطناعي',             'name_en' => 'Artificial Intelligence', 'slug' => 'ai',   'icon' => 'cpu'],
            ['name_ar' => 'الصحة والتقنية الصحية',        'name_en' => 'HealthTech',        'slug' => 'healthtech',    'icon' => 'first-aid-kit'],
            ['name_ar' => 'الزراعة الذكية',               'name_en' => 'AgriTech',          'slug' => 'agritech',      'icon' => 'plant'],
            ['name_ar' => 'الطاقة المتجددة',              'name_en' => 'Renewable Energy',  'slug' => 'energy',        'icon' => 'lightning'],
            ['name_ar' => 'التقنية المالية',              'name_en' => 'FinTech',           'slug' => 'fintech',       'icon' => 'bank'],
            ['name_ar' => 'العقارات والتقنية العقارية',   'name_en' => 'PropTech',          'slug' => 'real_estate',   'icon' => 'buildings'],
            ['name_ar' => 'السياحة والسفر',               'name_en' => 'TravelTech',        'slug' => 'travel',        'icon' => 'airplane'],
            ['name_ar' => 'النقل والخدمات اللوجستية',     'name_en' => 'Logistics',         'slug' => 'logistics',     'icon' => 'truck'],
            ['name_ar' => 'الأمن السيبراني',              'name_en' => 'Cybersecurity',     'slug' => 'cybersecurity', 'icon' => 'shield-check'],
            ['name_ar' => 'الألعاب والترفيه',             'name_en' => 'Gaming',            'slug' => 'gaming',        'icon' => 'game-controller'],
            ['name_ar' => 'التصنيع والصناعة الذكية',      'name_en' => 'Manufacturing',     'slug' => 'manufacturing', 'icon' => 'factory'],
            ['name_ar' => 'الاستدامة والبيئة',            'name_en' => 'Sustainability',    'slug' => 'sustainability','icon' => 'leaf'],
            ['name_ar' => 'الإعلام والتسويق الرقمي',      'name_en' => 'Media & Marketing', 'slug' => 'media',         'icon' => 'megaphone'],
        ];

        foreach ($categories as $i => $category) {
            Category::updateOrCreate(
                ['slug' => $category['slug']],
                $category + ['sort_order' => $i + 1]
            );
        }
    }
}
```

> **ملاحظة توافق:** 10 من هذه الـ slugs مطابقة لقائمة enums.md §1.12 (`fintech, healthtech, edtech, ecommerce, ai, agritech, logistics, real_estate, energy, gaming, media`) — الفرق تحويلها من سلسلة نصية مفتوحة إلى جدول مُدار بتوجيه المشروع.

---

## 4. `UserSeeder.php` — 15 مستخدماً (5/5/5)

```php
<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('password'); // بيئة تطوير فقط — غيّرها في الإنتاج

        $users = [
            // ————— أصحاب الأفكار (5) —————
            ['role' => 'idea_owner', 'name' => 'أحمد المحمدي', 'email' => 'owner1@example.com',
             'university' => 'جامعة الملك سعود', 'major' => 'علوم الحاسب',
             'bio' => 'مطور برمجيات ومهتم ببناء منتجات تقنية تخدم السوق السعودي.'],
            ['role' => 'idea_owner', 'name' => 'سارة العتيبي', 'email' => 'owner2@example.com',
             'university' => 'جامعة الملك عبدالعزيز', 'major' => 'هندسة البرمجيات',
             'bio' => 'مهندسة برمجيات وأعمل على مشاريع تعليمية تفاعلية للأطفال.'],
            ['role' => 'idea_owner', 'name' => 'محمد الشهري', 'email' => 'owner3@example.com',
             'university' => 'جامعة الملك فهد للبترول والمعادن', 'major' => 'نظم المعلومات',
             'bio' => 'خبير إنترنت الأشياء والزراعة الذكية، مع شراكات مع مزارع تجريبية.'],
            ['role' => 'idea_owner', 'name' => 'نورة القحطاني', 'email' => 'owner4@example.com',
             'university' => 'جامعة الأميرة نورة', 'major' => 'الذكاء الاصطناعي',
             'bio' => 'باحثة في الذكاء الاصطناعي وتطبيقاته في المجال الصحي.'],
            ['role' => 'idea_owner', 'name' => 'خالد العنزي', 'email' => 'owner5@example.com',
             'university' => 'جامعة الإمام محمد بن سعود', 'major' => 'إدارة الأعمال',
             'bio' => 'رائد أعمال متسلسل، مهتم بالتقنية المالية والامتثال الشرعي.'],

            // ————— المستثمرون (5) —————
            ['role' => 'investor', 'name' => 'عبدالله الغامدي', 'email' => 'investor1@example.com',
             'investment_focus' => 'استثمار ملائكي مبكر',
             'investment_range' => ['min' => 100000, 'max' => 1000000],
             'preferred_sectors' => ['التقنية المالية', 'الذكاء الاصطناعي'],
             'bio' => 'مستثمر ملاك منذ 2019، استثمرت في 6 شركات ناشئة بمنطقة الخليج.'],
            ['role' => 'investor', 'name' => 'فاطمة الزهراني', 'email' => 'investor2@example.com',
             'investment_focus' => 'رأس مال جريء — مرحلة البذرة',
             'investment_range' => ['min' => 250000, 'max' => 2000000],
             'preferred_sectors' => ['الصحة والتقنية الصحية', 'التعليم والتقنية التعليمية'],
             'bio' => 'شريكة في صندوق استثماري نسائي يركز على الصحة والتعليم.'],
            ['role' => 'investor', 'name' => 'سلطان الدوسري', 'email' => 'investor3@example.com',
             'investment_focus' => 'استثمار عقاري وتقني',
             'investment_range' => ['min' => 500000, 'max' => 5000000],
             'preferred_sectors' => ['العقارات والتقنية العقارية', 'الطاقة المتجددة'],
             'bio' => 'رجل أعمال في قطاع العقارات، يبحث عن مشاريع التقنية العقارية.'],
            ['role' => 'investor', 'name' => 'ريم الحربي', 'email' => 'investor4@example.com',
             'investment_focus' => 'صندوق عائلي — قطاع الضيافة',
             'investment_range' => ['min' => 200000, 'max' => 1500000],
             'preferred_sectors' => ['السياحة والسفر', 'الاستدامة والبيئة'],
             'bio' => 'تدير صندوقاً عائلياً يستثمر في السياحة والضيافة في المنطقة الغربية.'],
            ['role' => 'investor', 'name' => 'فيصل المطيري', 'email' => 'investor5@example.com',
             'investment_focus' => 'استثمار ملائكي — لوجستيات وأمن',
             'investment_range' => ['min' => 150000, 'max' => 800000],
             'preferred_sectors' => ['النقل والخدمات اللوجستية', 'الأمن السيبراني'],
             'bio' => 'خلفية 15 عاماً في سلاسل الإمداد، يستثمر في حلول التتبع والأمن.'],

            // ————— المشرفون (5 — seeder فقط) —————
            ['role' => 'admin', 'name' => 'إبراهيم السلمي', 'email' => 'admin1@example.com'],
            ['role' => 'admin', 'name' => 'هند الراشد',     'email' => 'admin2@example.com'],
            ['role' => 'admin', 'name' => 'عمر بن سعيد',    'email' => 'admin3@example.com'],
            ['role' => 'admin', 'name' => 'ليلى النجار',    'email' => 'admin4@example.com'],
            ['role' => 'admin', 'name' => 'يوسف الحمدان',   'email' => 'admin5@example.com'],
        ];

        foreach ($users as $data) {
            $role = Role::where('name', $data['role'])->firstOrFail();

            User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'role_id'          => $role->id,
                    'name'             => $data['name'],
                    'password'         => $password,
                    'email_verified_at' => now(),
                    'is_active'        => true,
                    'bio'              => $data['bio'] ?? null,
                    'university'       => $data['university'] ?? null,
                    'major'            => $data['major'] ?? null,
                    'investment_focus' => $data['investment_focus'] ?? null,
                    'investment_range' => $data['investment_range'] ?? null,
                    'preferred_sectors'=> $data['preferred_sectors'] ?? null,
                ]
            );
        }
    }
}
```

**ملاحظات:** `investment_range` و`preferred_sectors` يمرّران كمصفوفات — يتطلب `$casts` في `User` Model (`'array'`) · لا حاجة لحقل `provider` (تسجيل عادي) · يمكن إضافة مستخدم OAuth واحد للاختبار عبر `provider => 'google', provider_id => 'seed-google-1'`.

---

## 5. `ProjectSeeder.php` — 10 مشاريع عربية

```php
<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    public function run(): void
    {
        $projects = [
            [
                'owner_email' => 'owner1@example.com',
                'category' => 'ecommerce',
                'title' => 'سوق الحرف — منصة المنتجات الحرفية السعودية',
                'description' => 'منصة إلكترونية متكاملة تعرض المنتجات الحرفية السعودية من مختلف مناطق المملكة، تربط الحرفيين مباشرة بالمشترين، وتوفر نظام توثيق للجودة والأصالة، مع خدمة شحن موحدة لجميع مناطق المملكة ودول الخليج. الهدف تمكين الحرفيين من الوصول إلى أسواق أوسع وزيادة دخلهم عبر أدوات تسويق رقمية مبنية خصيصاً لطبيعة المنتج الحرفي.',
                'status' => 'needs_funding',
                'tags' => ['Laravel', 'Vue.js', 'MySQL', 'Meilisearch'],
                'github_url' => 'https://github.com/ihyaa/souq-alherf',
                'video_url' => 'https://www.youtube.com/watch?v=DEMO0000001',
                'budget_min' => 250000, 'budget_max' => 500000,
                'view_count' => 980,
            ],
            [
                'owner_email' => 'owner2@example.com',
                'category' => 'edtech',
                'title' => 'كود الطفل — تعليم البرمجة للأطفال بالعربية',
                'description' => 'تطبيق تفاعلي باللغة العربية يعلم الأطفال من 6 إلى 12 سنة أساسيات البرمجة عبر ألعاب ومغامرات مشوقة، بنظام مكافآت ومستويات متدرجة، مع تقارير تقدم لأولياء الأمور، ويغطي منهجاً معتمداً من وزارة التعليم. النسخة التجريبية جاهزة على متاجر التطبيقات، ونحتاج تطوير محتوى المستويات المتقدمة وإضافة أنشطة الذكاء الاصطناعي التفاعلي.',
                'status' => 'needs_development',
                'tags' => ['Flutter', 'Unity', 'Gamification', 'Arabic Content'],
                'github_url' => 'https://github.com/ihyaa/kod-altifl',
                'video_url' => 'https://www.youtube.com/watch?v=DEMO0000002',
                'budget_min' => 150000, 'budget_max' => 300000,
                'view_count' => 740,
            ],
            [
                'owner_email' => 'owner3@example.com',
                'category' => 'agritech',
                'title' => 'مزرعة ذكية — نظام ري بالذكاء الاصطناعي',
                'description' => 'نظام ري ذكي يعتمد على إنترنت الأشياء والذكاء الاصطناعي لتحليل بيانات التربة والطقس والتنبؤ باحتياجات المحاصيل المائية، يقلل استهلاك المياه حتى 40%، مع لوحة تحكم للمزارع وإشعارات فورية على الجوال. يخدم المشروع رؤية المملكة في ترشيد المياه وتحقيق الأمن الغذائي، وتوجد شراكات أولية مع مزرعتين تجريبيتين في منطقة القصيم.',
                'status' => 'needs_funding',
                'tags' => ['IoT', 'Python', 'TensorFlow', 'LoRaWAN'],
                'github_url' => 'https://github.com/ihyaa/mazraa',
                'video_url' => 'https://www.youtube.com/watch?v=DEMO0000003',
                'budget_min' => 400000, 'budget_max' => 800000,
                'view_count' => 610,
            ],
            [
                'owner_email' => 'owner4@example.com',
                'category' => 'healthtech',
                'title' => 'عيادتي أونلاين — استشارات طبية عن بعد',
                'description' => 'منصة استشارات طبية عن بعد تربط المرضى بأطباء معتمدين عبر مكالمات فيديو مشفرة، مع نظام مواعيد وإدارة ملفات طبية إلكترونية وتذكير تلقائي بالأدوية. تستهدف المدن الصغيرة التي تعاني نقص التخصصات الطبية، وتدعم تكاملاً مستقبلياً مع منظومة الصحة الوطنية، والفريق يضم أطباء ومطورين متخصصين في أمن البيانات الصحية.',
                'status' => 'needs_funding',
                'tags' => ['WebRTC', 'Laravel', 'Flutter', 'EHR'],
                'github_url' => 'https://github.com/ihyaa/3iyadati',
                'video_url' => 'https://www.youtube.com/watch?v=DEMO0000004',
                'budget_min' => 300000, 'budget_max' => 600000,
                'view_count' => 850,
            ],
            [
                'owner_email' => 'owner5@example.com',
                'category' => 'fintech',
                'title' => 'مالي الحلال — إدارة النفقات وفق أحكام الشريعة',
                'description' => 'تطبيق ذكي لإدارة النفقات الشخصية والأسرية وفق أحكام الشريعة الإسلامية، يصنف المصروفات تلقائياً، ويقدم خطط ادخار واستثمار متوافقة مع الضوابط الشرعية، مع تقارير شهرية وتنبيهات ذكية. يستهدف السوق الخليجي الذي يشهد نمواً متسارعاً في الخدمات المالية المتوافقة مع الشريعة، ونموذج العمل بالاشتراك الشهري مع طبقة مجانية.',
                'status' => 'needs_development',
                'tags' => ['React Native', 'Node.js', 'FinTech', 'Sharia Compliance'],
                'github_url' => 'https://github.com/ihyaa/mali-alhalal',
                'video_url' => 'https://www.youtube.com/watch?v=DEMO0000005',
                'budget_min' => 200000, 'budget_max' => 400000,
                'view_count' => 560,
            ],
            [
                'owner_email' => 'owner1@example.com',
                'category' => 'real_estate',
                'title' => 'سكني — منصة تأجير العقارات الرقمية',
                'description' => 'منصة رقمية لتأجير العقارات الصغيرة والشقق السكنية في المدن الرئيسية، بنظام توثيق إلكتروني للعقود ودفع آمن ومصادقة المستأجرين، مع تقييم موثوق للطرفين. تعالج مشكلة ارتفاع عمولات المكاتب التقليدية وتقلل الاحتيال عبر التحقق الآلي من الوثائق، والنسخة الأولى تعمل بمدينة الرياض وتم اختبارها مع 40 وحدة سكنية.',
                'status' => 'completed',
                'tags' => ['Laravel', 'Next.js', 'Payment APIs', 'E-Contract'],
                'github_url' => 'https://github.com/ihyaa/sakani',
                'video_url' => 'https://www.youtube.com/watch?v=DEMO0000006',
                'budget_min' => 500000, 'budget_max' => 1000000,
                'view_count' => 1120,
            ],
            [
                'owner_email' => 'owner2@example.com',
                'category' => 'travel',
                'title' => 'استكشف — حجوزات الوجهات السياحية المحلية',
                'description' => 'منصة حجوزات سياحية تركز على الوجهات المحلية السعودية غير المكتشفة، تقدم تجارب سياحية متكاملة من النقل والإقامة والجولات المصحوبة بمرشدين محليين، مع محتوى عربي أصيل ودعم للسياحة التراثية والطبيعية. تتوافق مع مستهدفات رؤية 2030 لاستقبال 150 مليون زيارة سنوياً، ونموذج العمل عمولة على كل حجز مع باقات للمنشآت السياحية.',
                'status' => 'needs_funding',
                'tags' => ['Next.js', 'Node.js', 'Maps API', 'TravelTech'],
                'github_url' => 'https://github.com/ihyaa/istakshif',
                'video_url' => 'https://www.youtube.com/watch?v=DEMO0000007',
                'budget_min' => 350000, 'budget_max' => 700000,
                'view_count' => 430,
            ],
            [
                'owner_email' => 'owner3@example.com',
                'category' => 'logistics',
                'title' => 'مسار — تتبع الشحنات في الوقت الفعلي',
                'description' => 'نظام لوجستي لتتبع الشحنات في الوقت الفعلي عبر أجهزة تتبع ذكية ولوحة تحكم موحدة، يرسل تنبيهات للعملاء ويحلل كفاءة خطوط النقل ويقترح التحسينات. يستهدف شركات التوزيع الصغيرة والمتوسطة التي تفتقر إلى حلول التتبع المتقدمة بأسعار معقولة، مع تقنية اتصال تعمل في المناطق النائية وتغطية كاملة لطرق المملكة.',
                'status' => 'needs_development',
                'tags' => ['IoT', 'GPS', 'Kafka', 'React'],
                'github_url' => 'https://github.com/ihyaa/masar',
                'video_url' => 'https://www.youtube.com/watch?v=DEMO0000008',
                'budget_min' => 450000, 'budget_max' => 900000,
                'view_count' => 390,
            ],
            [
                'owner_email' => 'owner4@example.com',
                'category' => 'gaming',
                'title' => 'حكاية — لعبة مغامرات عربية ثلاثية الأبعاد',
                'description' => 'لعبة مغامرات ثلاثية الأبعاد باللغة العربية مستوحاة من التراث والحكايات الشعبية، تجمع بين الترفيه والمحتوى التعليمي القيمي، بجودة رسوم تليق بالأسواق العالمية. تستهدف الأطفال واليافعين في المنطقة العربية وتتجاوز الحاجز الثقافي للألعاب الأجنبية، وتعمل على الجوال والحاسب مع وضع تعدد اللاعبين المخطط له في النسخة الثانية.',
                'status' => 'needs_funding',
                'tags' => ['Unity', 'C#', '3D Modeling', 'Arabic Narrative'],
                'github_url' => 'https://github.com/ihyaa/hikaya',
                'video_url' => 'https://www.youtube.com/watch?v=DEMO0000009',
                'budget_min' => 600000, 'budget_max' => 1200000,
                'view_count' => 1250,
            ],
            [
                'owner_email' => 'owner5@example.com',
                'category' => 'cybersecurity',
                'title' => 'درع — الامتثال الأمني للمنشآت الصغيرة',
                'description' => 'منصة رفع الوعي والامتثال للأمن السيبراني للمنشآت الصغيرة والمتوسطة، تقدم تقييمات تلقائية للجاهزية الأمنية وخططاً علاجية وإرشادات عملية بسيطة، مع لوحة متابعة للالتزام باللوائح. تسد فجوة كبيرة بعد صدور اللوائح التنظيمية الجديدة في المملكة، ونموذج العمل باشتراك سنوي حسب حجم المنشأة وعدد الموظفين.',
                'status' => 'needs_funding',
                'tags' => ['Python', 'Django', 'SIEM', 'Compliance'],
                'github_url' => 'https://github.com/ihyaa/diraa',
                'video_url' => 'https://www.youtube.com/watch?v=DEMO0000010',
                'budget_min' => 180000, 'budget_max' => 350000,
                'view_count' => 285,
            ],
        ];

        foreach ($projects as $data) {
            $owner = User::where('email', $data['owner_email'])->firstOrFail();
            $category = Category::where('slug', $data['category'])->firstOrFail();

            Project::updateOrCreate(
                ['title' => $data['title']],
                [
                    'user_id'          => $owner->id,
                    'category_id'      => $category->id,
                    'description'      => $data['description'],
                    'status'           => $data['status'],
                    'publication_status' => 'published',
                    'tags'             => $data['tags'],
                    'github_url'       => $data['github_url'],
                    'video_url'        => $data['video_url'],
                    'video_provider'   => 'youtube',
                    'budget_min'       => $data['budget_min'],
                    'budget_max'       => $data['budget_max'],
                    'visibility_level' => 3,          // الافتراضي: بعد الاتفاق
                    'view_count'       => $data['view_count'],
                ]
            );
        }
    }
}
```

**ملاحظات:**
- توزيع المشاريع: 10 مجالات مختلفة (ecommerce, edtech, agritech, healthtech, fintech, real_estate, travel, logistics, gaming, cybersecurity) · 4 حالات `needs_funding` متنوعة + 2 `needs_development` + 1 `completed` — يغطي فلاتر الحالة.
- `tags` كمصفوفة → يتطلب `$casts = ['tags' => 'array']` في `Project` Model.
- `video_url` بروابط صيغة YouTube صحيحة (DEMO — تُستبدل عند التشغيل الفعلي؛ التحقق يحدث فقط على مدخلات المستخدم).
- `visibility_level = 3` للجميع — يتوافق مع مصفوفة الإفصاح الافتراضية (SRS-F05-05).
- **سلة المهملات:** لا تُزرع مشاريع محذوفة — لاختبار تدفق Trash (SRS-TEST-15) احذف مشروعاً يدوياً في الجلسة.

---

## 6. اختياري: `DemoEvaluationSeeder.php` — تقييمات تجريبية للعرض

> **تحذير:** بيانات **تجريبية** للعرض والتطوير فقط (بيتا). أزل استدعاءه قبل الإطلاق أو استبدله بالتقييمات الحقيقية من محرك AI — سجل التقييمات مرجعي (SRS-DB-05) ولا يصح تلويثه ببيانات وهمية في الإنتاج.

```php
<?php

namespace Database\Seeders;

use App\Models\AiEvaluation;
use App\Models\Project;
use Illuminate\Database\Seeder;

class DemoEvaluationSeeder extends Seeder
{
    public function run(): void
    {
        $demo = [
            'سوق الحرف — منصة المنتجات الحرفية السعودية' => [82, 78, 85, 74, 88],
            'كود الطفل — تعليم البرمجة للأطفال بالعربية' => [76, 80, 72, 68, 79],
            'مزرعة ذكية — نظام ري بالذكاء الاصطناعي'      => [88, 90, 84, 71, 85],
            'عيادتي أونلاين — استشارات طبية عن بعد'       => [79, 74, 83, 80, 76],
            'استكشف — حجوزات الوجهات السياحية المحلية'   => [73, 70, 78, 65, 74],
            'حكاية — لعبة مغامرات عربية ثلاثية الأبعاد'   => [85, 92, 70, 72, 81],
            'درع — الامتثال الأمني للمنشآت الصغيرة'      => [77, 75, 80, 69, 78],
        ];

        $dimensions = ['technical_quality', 'innovation', 'market_viability', 'team_completeness', 'documentation'];

        foreach ($demo as $title => $scores) {
            $project = Project::where('title', $title)->firstOrFail();
            $overall = round(array_sum($scores) / count($scores), 2);

            $version = AiEvaluation::where('project_id', $project->id)->max('version') + 1;

            AiEvaluation::create([
                'project_id'      => $project->id,
                'version'         => $version,
                'status'          => 'completed',
                'overall_score'   => $overall,
                'scores'          => collect($dimensions)->mapWithKeys(fn ($d, $i) => [
                    $d => ['score' => $scores[$i], 'sub_scores' => [], 'strengths' => [], 'weaknesses' => []],
                ])->all(),
                'gap_analysis'    => ['technical_gaps' => [], 'market_gaps' => [], 'team_gaps' => [], 'documentation_gaps' => []],
                'recommendations' => ['immediate' => [], 'short_term' => [], 'long_term' => []],
                'required_skills' => [],
                'confidence_score'=> round(75 + $version * 2, 2),
                'warnings'        => ['بيانات تجريبية — أُنشئت بواسطة DemoEvaluationSeeder'],
                'model_used'      => 'openai',
                'processing_time_ms' => 95000,
            ]);

            // مزامنة المرآة (مثلما يفعل محرك AI عند الاكتمال)
            $project->update([
                'ai_score'           => $overall,
                'last_evaluation_at' => now(),
            ]);
        }
    }
}
```

**ملاحظات:** 7 مشاريع تحصل على تقييم مكتمل واحد (يُظهر المعرض درجات فورية) · يمكن إضافة نسخة ثانية لأحد المشاريع (`version = 2` بدرجة أعلى) لتجربة واجهة المقارنة (آخر 5 — SRS-F04-03) · `scores` مبسطة هنا — النسخة الإنتاجية تتبع مخطط SRS §5.4.6.3 كاملاً بمعاييرها الفرعية.

---

## 7. `DatabaseSeeder.php` — التنسيق النهائي

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            CategorySeeder::class,
            UserSeeder::class,
            ProjectSeeder::class,
            // DemoEvaluationSeeder::class, // ← أزل التعليق للعرض التجريبي فقط
        ]);
    }
}
```

---

## 8. التحقق والتشغيل

```bash
# تشغيل من الصفر (تطوير/اختبار فقط — حذف لكل الجداول)
php artisan migrate:fresh --seed

# أو تشغيل الـ seeders على قاعدة قائمة
php artisan db:seed

# التحقق من الأعداد المتوقعة: 3 أدوار · 15 تصنيفاً · 15 مستخدماً · 10 مشاريع
php artisan tinker --execute="
    dump('roles: ' . App\Models\Role::count());
    dump('categories: ' . App\Models\Category::count());
    dump('users: ' . App\Models\User::count());
    dump('idea_owners: ' . App\Models\User::whereHas('role', fn(\$q) => \$q->where('name', 'idea_owner'))->count());
    dump('investors: ' . App\Models\User::whereHas('role', fn(\$q) => \$q->where('name', 'investor'))->count());
    dump('admins: ' . App\Models\User::whereHas('role', fn(\$q) => \$q->where('name', 'admin'))->count());
    dump('projects: ' . App\Models\Project::count());
"
```

**النتيجة المتوقعة:** `roles: 3` · `categories: 15` · `users: 15` · `idea_owners: 5` · `investors: 5` · `admins: 5` · `projects: 10`

**حسابات الدخول للاختبار (كلمة المرور: `password`):**

| الدور | البريد | الغرض |
|-------|--------|-------|
| صاحب فكرة | `owner1@example.com` | لديه 2 مشاريع (سوق الحرف + سكني) |
| صاحب فكرة | `owner5@example.com` | لديه مشروعان (مالي الحلال + درع) |
| مستثمر | `investor1@example.com` | ملف كامل بقطاعات مفضلة — للبحث والاقتراحات |
| مشرف | `admin1@example.com` | لوحة التحليلات والتصدير CSV |

**تذكيرات أمان قبل الإنتاج:**
1. غيّر كلمة مرور الـ seeders (لا `password` في الإنتاج) أو احذف المستخدمين المزروعين.
2. `DemoEvaluationSeeder` خارج تشغيل الإنتاج نهائياً.
3. إعادة التشغيل آمنة (updateOrCreate) — لكن لا تُعد تشغيلها على قاعدة إنتاج ببيانات حقيقية بدون مراجعة الـ slugs والعناوين.
