# Shadcn UI Conversion Patterns

## Common Replacements

### 1. Remove wrapper divs
```tsx
// BEFORE
<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {content}
  </div>
</div>

// AFTER
<div className="space-y-6">
  {content}
</div>
```

### 2. Replace Cards
```tsx
// BEFORE
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Title</h2>
  <p className="text-gray-600 dark:text-gray-400">Description</p>
  {content}
</div>

// AFTER
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {content}
  </CardContent>
</Card>
```

### 3. Replace Buttons
```tsx
// BEFORE
<button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
  <Icon className="h-4 w-4 mr-2" />
  Text
</button>

// AFTER
<Button>
  <Icon className="h-4 w-4 mr-2" />
  Text
</Button>
```

### 4. Replace Inputs
```tsx
// BEFORE
<label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Label</label>
<input className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-900" />

// AFTER
<Label htmlFor="id">Label</Label>
<Input id="id" />
```

### 5. Replace Select
```tsx
// BEFORE
<select className="px-3 py-2 border rounded-md">
  <option value="1">One</option>
</select>

// AFTER
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">One</SelectItem>
  </SelectContent>
</Select>
```

### 6. Replace Tables
```tsx
// BEFORE
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th>Header</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data</td>
    </tr>
  </tbody>
</table>

// AFTER
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Header</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 7. Replace Badges/Status Indicators
```tsx
// BEFORE
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  Active
</span>

// AFTER
<Badge variant="default">Active</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Warning</Badge>
<Badge variant="secondary">Stopped</Badge>
```

### 8. Color Classes to Design Tokens
```tsx
// BEFORE
text-gray-600 dark:text-gray-400  →  text-muted-foreground
text-gray-900 dark:text-white     →  (default, no class needed)
bg-white dark:bg-gray-800         →  bg-card
bg-gray-50 dark:bg-gray-900       →  bg-background
text-blue-600                      →  text-primary
border-gray-200 dark:border-gray-700  →  border
```

## Automated Conversion Script

Use this sed script to handle common patterns:
```bash
#!/bin/bash
file=$1

# Replace common card patterns
sed -i 's/className="bg-white dark:bg-gray-800 rounded-lg shadow/className="/' "$file"
sed -i 's/className="min-h-screen bg-gray-50 dark:bg-gray-900"/className="space-y-6"/' "$file"

# Replace color classes
sed -i 's/text-gray-600 dark:text-gray-400/text-muted-foreground/g' "$file"
sed -i 's/text-gray-900 dark:text-white//g' "$file"
sed -i 's/bg-white dark:bg-gray-800/bg-card/g' "$file"
```
