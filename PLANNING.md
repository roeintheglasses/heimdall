# Event Categorization Implementation Plan

## 📊 Current State Analysis

### Existing Event Structure
```json
{
  "id": "uuid",
  "event_type": "github.push | vercel.deploy",
  "title": "string",
  "metadata": {
    "author": "string",
    "message": "string", 
    "repo": "string",
    "status": "string"
  },
  "created_at": "ISO timestamp"
}
```

### Current Event Types
- `github.push` - Git commits and pushes
- `vercel.deploy` - Deployment events  
- Potential future: `github.pr`, `github.issue`, `railway.deploy`, etc.

## 🎯 Proposed Category System

### Primary Categories
1. **Development** 📝
   - GitHub pushes, commits, branch creation
   - Pull requests, code reviews
   - Repository management

2. **Deployments** 🚀  
   - Vercel deployments
   - Railway deployments
   - Build successes/failures

3. **Infrastructure** ⚡
   - Server monitoring events
   - Database events  
   - Performance alerts

4. **Issues & Bugs** 🐛
   - Error notifications
   - Failed deployments
   - System alerts

5. **Security** 🔒
   - Dependency vulnerabilities
   - Access control changes
   - Security scan results

### Category Properties
```typescript
interface EventCategory {
  id: string           // 'development', 'deployments', etc.
  name: string         // 'Development', 'Deployments', etc.
  description: string  // Category description
  icon: string         // Lucide icon name
  color: string        // Tailwind color class
  priority: number     // Display priority (1-5)
}
```

## 🗄️ Database Schema Changes

### Option 1: Add Category Column (Recommended)
```sql
-- Add category column to existing events table
ALTER TABLE events ADD COLUMN category VARCHAR(50) DEFAULT 'development';
ALTER TABLE events ADD COLUMN subcategory VARCHAR(50) DEFAULT NULL;

-- Add indexes for performance
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_category_created_at ON events(category, created_at DESC);

-- Create categories lookup table
CREATE TABLE event_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  priority INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO event_categories (id, name, description, icon, color, priority) VALUES
('development', 'Development', 'Code commits, pushes, and repository changes', 'GitBranch', 'blue', 1),
('deployments', 'Deployments', 'Application deployments and builds', 'Rocket', 'green', 2),
('infrastructure', 'Infrastructure', 'Server and system monitoring', 'Server', 'purple', 3),
('issues', 'Issues & Bugs', 'Error notifications and system issues', 'AlertCircle', 'red', 4),
('security', 'Security', 'Security alerts and vulnerability reports', 'Shield', 'orange', 5);
```

### Option 2: Create Category Mapping Table (Scalable)
```sql
-- Keep events table unchanged, add mapping
CREATE TABLE event_category_mappings (
  event_type VARCHAR(100) PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50),
  FOREIGN KEY (category_id) REFERENCES event_categories(id)
);

-- Insert mappings
INSERT INTO event_category_mappings (event_type, category_id) VALUES
('github.push', 'development'),
('github.pr', 'development'),
('vercel.deploy', 'deployments'),
('railway.deploy', 'deployments'),
('error.system', 'issues'),
('security.vulnerability', 'security');
```

**Recommendation**: Use Option 1 for simplicity and performance.

## ⚙️ Backend API Changes (Go Service)

### 1. Database Model Updates
```go
// Update Event struct
type Event struct {
    ID          string                 `json:"id" db:"id"`
    EventType   string                 `json:"event_type" db:"event_type"`
    Category    string                 `json:"category" db:"category"`
    Subcategory *string                `json:"subcategory,omitempty" db:"subcategory"`
    Title       string                 `json:"title" db:"title"`
    Metadata    map[string]interface{} `json:"metadata" db:"metadata"`
    CreatedAt   time.Time              `json:"created_at" db:"created_at"`
}

// New Category struct
type EventCategory struct {
    ID          string    `json:"id" db:"id"`
    Name        string    `json:"name" db:"name"`
    Description string    `json:"description" db:"description"`
    Icon        string    `json:"icon" db:"icon"`
    Color       string    `json:"color" db:"color"`
    Priority    int       `json:"priority" db:"priority"`
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
}
```

### 2. Category Classification Logic
```go
func classifyEvent(eventType string) string {
    categoryMap := map[string]string{
        "github.push":           "development",
        "github.pr":            "development", 
        "github.issue":         "issues",
        "vercel.deploy":        "deployments",
        "railway.deploy":       "deployments",
        "error.system":         "issues",
        "security.vulnerability": "security",
    }
    
    if category, exists := categoryMap[eventType]; exists {
        return category
    }
    return "development" // default
}
```

### 3. New API Endpoints
```go
// GET /api/categories - Get all categories
func getCategoriesHandler(w http.ResponseWriter, r *http.Request) {
    categories, err := db.GetAllCategories()
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(categories)
}

// GET /api/events?category=development&limit=50
func getEventsHandler(w http.ResponseWriter, r *http.Request) {
    category := r.URL.Query().Get("category")
    limit := r.URL.Query().Get("limit")
    
    events, err := db.GetEventsByCategory(category, limit)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(events)
}

// GET /api/events/stats - Get category statistics  
func getEventStatsHandler(w http.ResponseWriter, r *http.Request) {
    stats, err := db.GetCategoryStats()
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(stats)
}
```

### 4. Database Query Updates
```go
func (db *Database) GetEventsByCategory(category string, limit int) ([]Event, error) {
    query := `
        SELECT id, event_type, category, subcategory, title, metadata, created_at
        FROM events 
        WHERE ($1 = '' OR category = $1)
        ORDER BY created_at DESC 
        LIMIT $2`
    
    rows, err := db.conn.Query(query, category, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    // Parse results...
}

func (db *Database) GetCategoryStats() (map[string]int, error) {
    query := `
        SELECT category, COUNT(*) as count
        FROM events 
        GROUP BY category
        ORDER BY count DESC`
    
    rows, err := db.conn.Query(query)
    // Parse results into map[string]int
}
```

## 🎨 Frontend Implementation Plan

### 1. New shadcn/ui Components Needed
```bash
# Install additional shadcn components
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toggle-group  
npx shadcn-ui@latest add select
npx shadcn-ui@latest add command
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add breadcrumb
```

### 2. Category Context & State Management
```typescript
// contexts/CategoryContext.tsx
interface CategoryContextType {
  categories: EventCategory[]
  selectedCategory: string | null
  categoryStats: Record<string, number>
  setSelectedCategory: (category: string | null) => void
  fetchCategories: () => Promise<void>
  fetchCategoryStats: () => Promise<void>
}

const CategoryContext = createContext<CategoryContextType | null>(null)

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<EventCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({})
  
  // Implementation...
}
```

### 3. Enhanced Event Interface
```typescript
interface DashboardEvent {
  id: string
  event_type: string
  category: string
  subcategory?: string
  title: string
  metadata: Record<string, any>
  created_at: string
  isNew?: boolean
}
```

### 4. New UI Components

#### CategoryFilter Component
```typescript
// components/CategoryFilter.tsx
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface CategoryFilterProps {
  categories: EventCategory[]
  selectedCategory: string | null
  categoryStats: Record<string, number>
  onCategoryChange: (category: string | null) => void
}

export function CategoryFilter({ 
  categories, 
  selectedCategory, 
  categoryStats, 
  onCategoryChange 
}: CategoryFilterProps) {
  return (
    <Tabs value={selectedCategory || 'all'} onValueChange={onCategoryChange}>
      <TabsList className="grid grid-cols-6 w-full">
        <TabsTrigger value="all" className="flex items-center gap-2">
          All
          <Badge variant="secondary" className="text-xs">
            {Object.values(categoryStats).reduce((a, b) => a + b, 0)}
          </Badge>
        </TabsTrigger>
        {categories.map(category => (
          <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
            <Icon name={category.icon} className="h-4 w-4" />
            {category.name}
            <Badge variant="secondary" className="text-xs">
              {categoryStats[category.id] || 0}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
```

#### CategoryStatsCards Component
```typescript
// components/CategoryStatsCards.tsx
export function CategoryStatsCards({ 
  categories, 
  categoryStats 
}: CategoryStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {categories.map(category => (
        <Card key={category.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${category.color}-100 dark:bg-${category.color}-900/20`}>
                <Icon name={category.icon} className={`h-5 w-5 text-${category.color}-600 dark:text-${category.color}-400`} />
              </div>
              <div>
                <p className="text-sm font-medium">{category.name}</p>
                <p className="text-2xl font-bold">{categoryStats[category.id] || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

### 5. Enhanced Dashboard Layout
```typescript
// app/dashboard/page.tsx updates
export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<EventCategory[]>([])
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({})
  
  // Filter events by category
  const filteredEvents = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') {
      return events
    }
    return events.filter(event => event.category === selectedCategory)
  }, [events, selectedCategory])
  
  return (
    <div className="container mx-auto p-6">
      {/* Category Stats Overview */}
      <CategoryStatsCards categories={categories} categoryStats={categoryStats} />
      
      {/* Category Filter Tabs */}
      <CategoryFilter 
        categories={categories}
        selectedCategory={selectedCategory}
        categoryStats={categoryStats}
        onCategoryChange={setSelectedCategory}
      />
      
      {/* Filtered Events List */}
      <div className="space-y-4">
        {filteredEvents.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}
```

## 🚀 Implementation Roadmap

### Phase 1: Database & Backend (Railway)
1. **Database Migration** (30 mins)
   - Add category column to events table
   - Create event_categories table
   - Insert default categories
   - Add indexes

2. **Backend API Updates** (60 mins)  
   - Update Event struct
   - Add category classification logic
   - Implement new API endpoints
   - Update webhook processing to assign categories
   - Deploy to Railway

### Phase 2: Frontend Core (Vercel)
1. **Install shadcn Components** (15 mins)
   - Add required components (tabs, select, etc.)

2. **Category Context & State** (45 mins)
   - Create CategoryContext
   - Implement category fetching logic
   - Add category state management

3. **Update Event Interface** (15 mins)
   - Add category fields to TypeScript interfaces

### Phase 3: UI Components
1. **CategoryFilter Component** (60 mins)
   - Implement tabs-based category filter
   - Add category counts/badges
   - Mobile responsive design

2. **CategoryStatsCards Component** (45 mins)
   - Create overview stats cards
   - Add hover effects and animations
   - Responsive grid layout

3. **Enhanced EventCard** (30 mins)
   - Update to show category indicators
   - Improve visual hierarchy

### Phase 4: Dashboard Integration  
1. **Update Dashboard Page** (60 mins)
   - Integrate category filtering
   - Add stats overview
   - Update event fetching logic

2. **Add Search & Advanced Filters** (45 mins)
   - Combine category filter with search
   - Add date range filtering
   - Implement filter state persistence

### Phase 5: Testing & Deployment
1. **Testing** (30 mins)
   - Test category assignment on new events
   - Verify filtering functionality
   - Test responsive design

2. **Deploy & Monitor** (15 mins)
   - Deploy frontend to Vercel
   - Monitor for any issues
   - Update existing events with categories

## ⚡ Quick Wins for MVP

### Minimal Implementation (90 minutes)
1. **Simple Category Mapping** (30 mins)
   - Frontend-only solution
   - Map existing event_type to categories in UI
   - No backend changes needed initially

2. **Basic Category Tabs** (45 mins)
   - Add shadcn Tabs component
   - Filter events by category in frontend
   - Show category counts

3. **Enhanced Event Cards** (15 mins)
   - Add category badges to existing EventCard
   - Update colors and icons

This approach allows you to see the categorization in action immediately, then enhance with backend support later.

## 📝 Migration Strategy

### Backward Compatibility
- Existing events without categories default to "development"
- API maintains compatibility with existing endpoints
- Frontend gracefully handles missing category data

### Data Migration
```sql
-- Update existing events with categories based on event_type
UPDATE events SET category = 'development' WHERE event_type LIKE 'github.%';
UPDATE events SET category = 'deployments' WHERE event_type LIKE 'vercel.%';
UPDATE events SET category = 'deployments' WHERE event_type LIKE 'railway.%';
```

## 🎯 Success Metrics
- **User Experience**: Faster event filtering and categorization
- **Performance**: Sub-100ms category filtering
- **Scalability**: Support for 10+ categories without UI clutter
- **Mobile**: Fully responsive category interface

This comprehensive plan ensures a smooth implementation of event categorization while maintaining system reliability and user experience.