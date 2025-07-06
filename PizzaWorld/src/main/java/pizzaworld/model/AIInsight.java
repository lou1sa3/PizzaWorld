package pizzaworld.model;

import java.time.LocalDateTime;

public class AIInsight {
    private String id;
    private String type;
    private String title;
    private String description;
    private String recommendation;
    private Double confidence;
    private String category;
    private String targetEntity; // store, product, customer, etc.
    private String targetEntityId;
    private LocalDateTime createdAt;
    private String createdBy;
    private Boolean isActionable;
    private String priority; // high, medium, low
    
    // Constructors
    public AIInsight() {
        this.createdAt = LocalDateTime.now();
        this.confidence = 0.0;
        this.isActionable = false;
        this.priority = "medium";
    }
    
    public AIInsight(String type, String title, String description) {
        this();
        this.type = type;
        this.title = title;
        this.description = description;
    }
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
    
    public Double getConfidence() { return confidence; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }
    
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    
    public String getTargetEntity() { return targetEntity; }
    public void setTargetEntity(String targetEntity) { this.targetEntity = targetEntity; }
    
    public String getTargetEntityId() { return targetEntityId; }
    public void setTargetEntityId(String targetEntityId) { this.targetEntityId = targetEntityId; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    
    public Boolean getIsActionable() { return isActionable; }
    public void setIsActionable(Boolean isActionable) { this.isActionable = isActionable; }
    
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
} 